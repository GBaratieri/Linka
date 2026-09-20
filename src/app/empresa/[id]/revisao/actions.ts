'use server';

import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';
import { sincronizarNomeESegmento, calcularValoresEfetivos } from '@/lib/conectores/normalizador';
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

  // Pode haver mais de uma linha por campo (uma por origem) desde que passou
  // a ser possível complementar a extração com outra fonte — compara contra
  // o valor efetivo (já resolvido entre as origens), não contra uma linha
  // qualquer.
  const { data: linhas } = await supabase
    .from('campo_extraido')
    .select('campo, valor, origem, confianca, editado_pelo_usuario')
    .eq('empresa_id', empresaId)
    .order('criado_em', { ascending: true });
  const efetivos = calcularValoresEfetivos(linhas ?? []);

  for (const campo of CAMPOS_EDITAVEIS) {
    const valorForm = formData.get(campo);
    if (valorForm === null) continue;

    const novoValor = String(valorForm).trim() || null;
    // Campo deixado em branco: nada para confirmar como valor final — não
    // trava esse campo contra uma fonte futura que venha a preenchê-lo.
    if (novoValor === null) continue;

    const valorAtual = (efetivos.get(campo)?.valor as string | null) ?? null;
    const mudou = novoValor !== valorAtual;

    // Sempre grava como origem "manual" com editado_pelo_usuario=true, MESMO
    // quando o texto não mudou: o campo já vem pré-preenchido com o valor
    // efetivo (ver RevisaoForm), então clicar em "Confirmar dados" sem
    // reescrever nada é a forma mais comum de o usuário aceitar o valor
    // mostrado — precisa contar como a palavra final dele tanto quanto uma
    // edição de texto, senão confirmar sem mexer em nada nunca protege o
    // campo de ser sobrescrito por uma fonte adicionada depois (ver
    // docs/decisoes.md).
    const { error } = await supabase.from('campo_extraido').upsert(
      {
        empresa_id: empresaId,
        campo,
        valor: novoValor,
        origem: 'manual',
        confianca: 'alta',
        editado_pelo_usuario: true,
      },
      { onConflict: 'empresa_id,campo,origem' },
    );
    if (error) {
      console.error(`Falha ao gravar a edição do campo "${campo}":`, error);
      return { erro: 'Não foi possível salvar as alterações agora. Tente novamente em instantes.' };
    }

    // O evento de "esforço de correção" (seção 9 do CLAUDE.md) só faz
    // sentido quando o texto realmente mudou, não a cada confirmação.
    if (mudou) {
      await supabase
        .from('evento_produto')
        .insert({ empresa_id: empresaId, tipo: 'campo_editado', payload: { campo } });
    }
  }

  try {
    await sincronizarNomeESegmento(supabase, empresaId);
  } catch (erro) {
    console.error('Falha ao sincronizar nome/segmento após revisão:', erro);
    return { erro: 'Não foi possível salvar as alterações agora. Tente novamente em instantes.' };
  }

  // Marca como confirmadas só as linhas que efetivamente valem agora (com as
  // edições acima já aplicadas) — não as divergentes/perdedoras de outras
  // origens, que o usuário nunca viu como "o valor" do campo.
  const { data: linhasAtualizadas } = await supabase
    .from('campo_extraido')
    .select('id, campo, valor, origem, confianca, editado_pelo_usuario')
    .eq('empresa_id', empresaId)
    .order('criado_em', { ascending: true });
  const idsEfetivos = [...calcularValoresEfetivos(linhasAtualizadas ?? []).values()]
    .map((linha) => linha.id)
    .filter((id): id is string => Boolean(id));
  if (idsEfetivos.length) {
    await supabase
      .from('campo_extraido')
      .update({ confirmado_pelo_usuario: true })
      .in('id', idsEfetivos);
  }

  await supabase
    .from('empresa')
    .update({ declaracao_titularidade_em: new Date().toISOString() })
    .eq('id', empresaId);
  await supabase
    .from('evento_produto')
    .insert({ empresa_id: empresaId, tipo: 'revisao_confirmada' });

  redirect(`/empresa/${empresaId}/confirmado`);
}
