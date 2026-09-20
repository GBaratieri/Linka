import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import type { TipoFonteDados } from './tipos';
import type { ResultadoEstruturador, Confianca } from '@/lib/schemas/empresa';
import { buscarDadosGoogle } from './google';
import { estruturarEmpresa } from '@/lib/ia/estruturador';

// Campos onde o Google prevalece sobre Instagram/manual, e vice-versa
// (seção 8 do CLAUDE.md, regra de conflito da Fase 2). Fora dessas listas,
// quem tiver maior confiança vence; empatado, a extração mais recente vence.
const CAMPOS_PRIORIDADE_GOOGLE = new Set([
  'endereco.texto',
  'endereco.lat',
  'endereco.lng',
  'contato.telefone',
  'horarios',
]);
const CAMPOS_PRIORIDADE_MANUAL_OU_INSTAGRAM = new Set([
  'descricao_curta',
  'midia.fotos',
  'midia.logo',
]);

const PESO_CONFIANCA: Record<Confianca, number> = { alta: 3, media: 2, baixa: 1 };

function prioridadeDaFonte(caminho: string, fonte: TipoFonteDados): number {
  if (CAMPOS_PRIORIDADE_GOOGLE.has(caminho)) return fonte === 'google' ? 1 : 0;
  if (CAMPOS_PRIORIDADE_MANUAL_OU_INSTAGRAM.has(caminho)) return fonte !== 'google' ? 1 : 0;
  return 0;
}

export function deveSubstituirCampo(
  caminho: string,
  existente: { fonte: TipoFonteDados; confianca: Confianca },
  nova: { fonte: TipoFonteDados; confianca: Confianca },
): boolean {
  const prioridadeExistente = prioridadeDaFonte(caminho, existente.fonte);
  const prioridadeNova = prioridadeDaFonte(caminho, nova.fonte);
  if (prioridadeNova !== prioridadeExistente) {
    return prioridadeNova > prioridadeExistente;
  }
  return PESO_CONFIANCA[nova.confianca] >= PESO_CONFIANCA[existente.confianca];
}

function valorNoCaminho(objeto: unknown, caminho: string): unknown {
  return caminho.split('.').reduce<unknown>((atual, chave) => {
    if (atual && typeof atual === 'object' && chave in (atual as Record<string, unknown>)) {
      return (atual as Record<string, unknown>)[chave];
    }
    return undefined;
  }, objeto);
}

// Grava o resultado do estruturador em campo_extraido, aplicando a regra de
// conflito contra o que já existir para essa empresa.
export async function gravarCamposExtraidos(
  supabase: SupabaseClient<Database>,
  empresaId: string,
  resultado: ResultadoEstruturador,
): Promise<void> {
  const { data: existentes } = await supabase
    .from('campo_extraido')
    .select('id, campo, origem, confianca')
    .eq('empresa_id', empresaId);

  const existentesPorCampo = new Map((existentes ?? []).map((linha) => [linha.campo, linha]));

  for (const [caminho, info] of Object.entries(resultado.origem_e_confianca)) {
    const valor = valorNoCaminho(resultado.empresa, caminho);
    if (valor === undefined) continue;

    const existente = existentesPorCampo.get(caminho);

    if (!existente) {
      await supabase.from('campo_extraido').insert({
        empresa_id: empresaId,
        campo: caminho,
        valor,
        origem: info.fonte,
        confianca: info.confianca,
      });
      continue;
    }

    const substituir = deveSubstituirCampo(
      caminho,
      { fonte: existente.origem, confianca: existente.confianca },
      info,
    );
    if (!substituir) continue;

    await supabase
      .from('campo_extraido')
      .update({ valor, origem: info.fonte, confianca: info.confianca })
      .eq('id', existente.id);
  }

  await sincronizarNomeESegmento(supabase, empresaId);
}

// empresa.nome/segmento são as colunas "atuais" usadas pelo resto do app
// (painel, subdomínio, SEO); campo_extraido continua sendo a fonte de
// verdade completa, com origem e confiança por campo.
export async function sincronizarNomeESegmento(
  supabase: SupabaseClient<Database>,
  empresaId: string,
): Promise<void> {
  const { data } = await supabase
    .from('campo_extraido')
    .select('campo, valor')
    .eq('empresa_id', empresaId)
    .in('campo', ['nome', 'segmento']);

  const nome = data?.find((linha) => linha.campo === 'nome')?.valor as string | undefined;
  const segmento = data?.find((linha) => linha.campo === 'segmento')?.valor as string | undefined;

  if (!nome && !segmento) return;

  await supabase
    .from('empresa')
    .update({ ...(nome ? { nome } : {}), ...(segmento ? { segmento } : {}) })
    .eq('id', empresaId);
}

export interface FonteParaProcessar {
  id: string;
  tipo: TipoFonteDados;
  url: string | null;
}

// Dispara a extração de uma fonte de dados pendente. Chamado de forma
// síncrona a partir de app/empresa/[id]/page.tsx (ver docs/decisoes.md,
// "Extração síncrona em vez de polling") — a lógica em si é uma função pura
// o bastante para trocar por fila/polling depois sem reescrever nada aqui.
export async function processarFonteDados(
  supabase: SupabaseClient<Database>,
  empresaId: string,
  fonte: FonteParaProcessar,
): Promise<void> {
  if (fonte.tipo === 'instagram') {
    await supabase.from('fonte_dados').update({ status: 'nao_configurado' }).eq('id', fonte.id);
    return;
  }

  if (fonte.tipo === 'manual') {
    // O formulário manual grava campo_extraido diretamente; nada a extrair aqui.
    return;
  }

  if (!fonte.url) {
    await supabase.from('fonte_dados').update({ status: 'erro' }).eq('id', fonte.id);
    return;
  }

  const inicio = Date.now();
  try {
    const dados = await buscarDadosGoogle(fonte.url);
    if (!dados) {
      await supabase.from('fonte_dados').update({ status: 'erro' }).eq('id', fonte.id);
      return;
    }

    const resultado = await estruturarEmpresa({ origem: 'google', dadosBrutos: dados });
    await gravarCamposExtraidos(supabase, empresaId, resultado);

    await supabase
      .from('fonte_dados')
      .update({ status: 'ok', bruto: dados, coletado_em: new Date().toISOString() })
      .eq('id', fonte.id);

    await supabase.from('evento_pesquisa').insert({
      empresa_id: empresaId,
      tipo: 'extracao_concluida',
      payload: { fonte: 'google', duracaoMs: Date.now() - inicio },
    });
  } catch (erro) {
    console.error('Falha ao processar fonte de dados do Google:', erro);
    await supabase.from('fonte_dados').update({ status: 'erro' }).eq('id', fonte.id);
  }
}
