'use server';

import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';
import { sincronizarNomeESegmento } from '@/lib/conectores/normalizador';

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

  await sincronizarNomeESegmento(supabase, empresaId);
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
