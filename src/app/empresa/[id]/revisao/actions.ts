'use server';

import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';
import { sincronizarNomeESegmento } from '@/lib/conectores/normalizador';
import { segmentoSchema } from '@/lib/schemas/empresa';

export interface EstadoRevisao {
  erro?: string;
}

// Só os campos escalares (texto/número) são editáveis nesta tela; horários,
// serviços e fotos aparecem como leitura nesta fase (ver docs/decisoes.md,
// "Edição inline limitada a campos escalares").
export const CAMPOS_EDITAVEIS = [
  'nome',
  'segmento',
  'descricao_curta',
  'contato.telefone',
  'contato.whatsapp',
  'contato.email',
  'contato.instagram',
  'contato.site',
  'endereco.texto',
] as const;

export async function confirmarRevisao(
  empresaId: string,
  _estadoAnterior: EstadoRevisao,
  formData: FormData,
): Promise<EstadoRevisao> {
  if (formData.get('titularidade') !== 'on') {
    return { erro: 'Confirme que você é dono ou responsável pelo negócio para continuar.' };
  }

  // Nome e segmento são a identidade da empresa (usados em subdomínio/SEO nas
  // próximas fases) — mesmo com o `required` no formulário, valida de novo
  // aqui para não depender só do HTML (uma requisição adulterada poderia
  // mandar um valor vazio ou um segmento fora do enum).
  const nomeForm = String(formData.get('nome') ?? '').trim();
  if (!nomeForm) {
    return { erro: 'Informe o nome da empresa antes de confirmar.' };
  }
  if (!segmentoSchema.safeParse(formData.get('segmento')).success) {
    return { erro: 'Selecione um ramo válido antes de confirmar.' };
  }

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: existentes } = await supabase
    .from('campo_extraido')
    .select('id, campo, valor')
    .eq('empresa_id', empresaId);
  const porCampo = new Map((existentes ?? []).map((linha) => [linha.campo, linha]));

  for (const campo of CAMPOS_EDITAVEIS) {
    const valorForm = formData.get(campo);
    if (valorForm === null) continue;

    const novoValor = String(valorForm).trim() || null;
    const existente = porCampo.get(campo);
    const valorAtual = existente ? ((existente.valor as string | null) ?? null) : null;

    if (novoValor === valorAtual) continue;

    if (existente) {
      await supabase
        .from('campo_extraido')
        .update({ valor: novoValor, editado_pelo_usuario: true })
        .eq('id', existente.id);
    } else if (novoValor !== null) {
      await supabase.from('campo_extraido').insert({
        empresa_id: empresaId,
        campo,
        valor: novoValor,
        origem: 'manual',
        confianca: 'alta',
      });
    }

    await supabase
      .from('evento_pesquisa')
      .insert({ empresa_id: empresaId, tipo: 'campo_editado', payload: { campo } });
  }

  try {
    await sincronizarNomeESegmento(supabase, empresaId);
  } catch (erro) {
    console.error('Falha ao sincronizar nome/segmento após revisão:', erro);
    return { erro: 'Não foi possível salvar as alterações agora. Tente novamente em instantes.' };
  }
  await supabase
    .from('campo_extraido')
    .update({ confirmado_pelo_usuario: true })
    .eq('empresa_id', empresaId);
  await supabase
    .from('empresa')
    .update({ declaracao_titularidade_em: new Date().toISOString() })
    .eq('id', empresaId);
  await supabase
    .from('evento_pesquisa')
    .insert({ empresa_id: empresaId, tipo: 'revisao_confirmada' });

  redirect(`/empresa/${empresaId}/confirmado`);
}
