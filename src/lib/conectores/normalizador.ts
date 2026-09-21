import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import type { TipoFonteDados, StatusFonteDados } from './tipos';
import type { ResultadoEstruturador, Confianca, EmpresaNormalizada, Segmento } from '@/lib/schemas/empresa';
import { buscarDadosGoogle } from './google';
import { estruturarEmpresa } from '@/lib/ia/estruturador';
import { payloadComUso, type UsoTokens } from '@/lib/metricas/custos';

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

export interface CampoParaGravar {
  caminho: string;
  valor: unknown;
  fonte: TipoFonteDados;
  confianca: Confianca;
}

// Cada origem tem sua própria linha por campo (constraint única em
// empresa_id+campo+origem — ver
// supabase/migrations/20260920120000_campo_extraido_unico_por_origem.sql),
// então gravar nunca precisa decidir "substitui ou não": é sempre um upsert
// na linha daquela origem. A regra de conflito (seção 8 do CLAUDE.md) e o
// Verificador de consistência operam na leitura, comparando as linhas de
// todas as origens — ver calcularValoresEfetivos, mais abaixo, e
// lib/consistencia/comparador.ts. Usa upsert (não insert simples) para não
// duplicar linhas em reenvios do formulário ou corridas simultâneas. Erros
// do Supabase são propagados (lançados) em vez de ignorados, para que o
// chamador saiba que a gravação falhou e não marque a fonte como "ok".
export async function gravarCampos(
  supabase: SupabaseClient<Database>,
  empresaId: string,
  campos: CampoParaGravar[],
): Promise<void> {
  for (const { caminho, valor, fonte, confianca } of campos) {
    if (valor === undefined) continue;

    const { error } = await supabase
      .from('campo_extraido')
      .upsert(
        { empresa_id: empresaId, campo: caminho, valor, origem: fonte, confianca },
        { onConflict: 'empresa_id,campo,origem' },
      );
    if (error) {
      throw new Error(`Falha ao gravar o campo "${caminho}" (origem ${fonte}): ${error.message}`);
    }
  }
}

export interface LinhaCampoExtraido {
  id?: string;
  campo: string;
  valor: unknown;
  origem: TipoFonteDados;
  confianca: Confianca;
  editado_pelo_usuario?: boolean;
}

// Reduz várias linhas por campo (uma por origem) ao valor "efetivo" de cada
// campo, aplicando a mesma regra de prioridade/confiança de deveSubstituirCampo
// — mas agora na leitura, não mais na gravação. Uma edição do usuário na
// revisão (editado_pelo_usuario=true) sempre vence: é a palavra final dele
// sobre o próprio dado, independente da prioridade de origem. Em empate,
// processa `linhas` na ordem em que vieram (normalmente por criado_em
// crescente) para que a mais recente vença, como antes.
export function calcularValoresEfetivos(
  linhas: LinhaCampoExtraido[],
): Map<string, LinhaCampoExtraido> {
  const porCampo = new Map<string, LinhaCampoExtraido>();

  for (const linha of linhas) {
    const atual = porCampo.get(linha.campo);

    if (!atual) {
      porCampo.set(linha.campo, linha);
      continue;
    }
    if (atual.editado_pelo_usuario && !linha.editado_pelo_usuario) continue;
    if (linha.editado_pelo_usuario && !atual.editado_pelo_usuario) {
      porCampo.set(linha.campo, linha);
      continue;
    }

    const substituir = deveSubstituirCampo(
      linha.campo,
      { fonte: atual.origem, confianca: atual.confianca },
      { fonte: linha.origem, confianca: linha.confianca },
    );
    if (substituir) porCampo.set(linha.campo, linha);
  }

  return porCampo;
}

// Reconstrói o formato EmpresaNormalizada (seção 7 do CLAUDE.md) a partir
// dos valores efetivos de campo_extraido — é essa reconstrução, não o
// resultado bruto de uma extração, que a Fase 3 usa pra gerar textos e
// renderizar o site: reflete os dados já confirmados/editados na revisão,
// de todas as fontes combinadas. Campo sem valor efetivo = null/vazio,
// nunca inventado (regra 2 do CLAUDE.md).
export function montarEmpresaNormalizada(
  valoresEfetivos: Map<string, LinhaCampoExtraido>,
): EmpresaNormalizada {
  const valor = (campo: string): unknown => valoresEfetivos.get(campo)?.valor;

  return {
    nome: (valor('nome') as string | undefined) ?? '',
    segmento: (valor('segmento') as Segmento | undefined) ?? 'outro',
    descricao_curta: (valor('descricao_curta') as string | undefined) ?? null,
    servicos: (valor('servicos') as EmpresaNormalizada['servicos'] | undefined) ?? [],
    contato: {
      whatsapp: (valor('contato.whatsapp') as string | undefined) ?? null,
      telefone: (valor('contato.telefone') as string | undefined) ?? null,
      email: (valor('contato.email') as string | undefined) ?? null,
      instagram: (valor('contato.instagram') as string | undefined) ?? null,
      site: (valor('contato.site') as string | undefined) ?? null,
    },
    endereco: {
      texto: (valor('endereco.texto') as string | undefined) ?? null,
      lat: (valor('endereco.lat') as number | undefined) ?? null,
      lng: (valor('endereco.lng') as number | undefined) ?? null,
    },
    horarios: (valor('horarios') as EmpresaNormalizada['horarios'] | undefined) ?? [],
    midia: {
      logo: (valor('midia.logo') as string | undefined) ?? null,
      fotos: (valor('midia.fotos') as string[] | undefined) ?? [],
    },
    prova_social: {
      nota: (valor('prova_social.nota') as number | undefined) ?? null,
      total_avaliacoes: (valor('prova_social.total_avaliacoes') as number | undefined) ?? null,
      avaliacoes:
        (valor('prova_social.avaliacoes') as EmpresaNormalizada['prova_social']['avaliacoes'] | undefined) ??
        [],
    },
  };
}

// Grava o resultado do estruturador em campo_extraido, aplicando a regra de
// conflito contra o que já existir para essa empresa.
export async function gravarCamposExtraidos(
  supabase: SupabaseClient<Database>,
  empresaId: string,
  resultado: ResultadoEstruturador,
): Promise<void> {
  const campos: CampoParaGravar[] = Object.entries(resultado.origem_e_confianca).map(
    ([caminho, info]) => ({
      caminho,
      valor: valorNoCaminho(resultado.empresa, caminho),
      fonte: info.fonte,
      confianca: info.confianca,
    }),
  );

  await gravarCampos(supabase, empresaId, campos);
  await sincronizarNomeESegmento(supabase, empresaId);
}

// empresa.nome/segmento são as colunas "atuais" usadas pelo resto do app
// (painel, subdomínio, SEO); campo_extraido continua sendo a fonte de
// verdade completa, com origem e confiança por campo. Propaga o valor de
// campo_extraido tal como ele está — inclusive null, quando o usuário limpa
// o campo na revisão — em vez de ignorar silenciosamente uma linha existente
// só porque o valor está vazio.
export async function sincronizarNomeESegmento(
  supabase: SupabaseClient<Database>,
  empresaId: string,
): Promise<void> {
  const { data, error: erroConsulta } = await supabase
    .from('campo_extraido')
    .select('campo, valor, origem, confianca, editado_pelo_usuario')
    .eq('empresa_id', empresaId)
    .in('campo', ['nome', 'segmento'])
    .order('criado_em', { ascending: true });

  if (erroConsulta) {
    throw new Error(`Falha ao consultar nome/segmento: ${erroConsulta.message}`);
  }

  const efetivos = calcularValoresEfetivos(data ?? []);
  const linhaNome = efetivos.get('nome');
  const linhaSegmento = efetivos.get('segmento');

  if (!linhaNome && !linhaSegmento) return;

  const atualizacoes: { nome?: string | null; segmento?: string | null } = {};
  if (linhaNome) atualizacoes.nome = linhaNome.valor as string | null;
  if (linhaSegmento) atualizacoes.segmento = linhaSegmento.valor as string | null;

  const { error } = await supabase.from('empresa').update(atualizacoes).eq('id', empresaId);
  if (error) {
    throw new Error(`Falha ao sincronizar nome/segmento: ${error.message}`);
  }
}

export interface FonteParaProcessar {
  id: string;
  tipo: TipoFonteDados;
  url: string | null;
}

// Dispara a extração de uma fonte de dados pendente e devolve o status final
// (evita uma segunda consulta ao banco para "descobrir" o que esta mesma
// função acabou de gravar). Chamado de forma síncrona a partir de
// app/empresa/[id]/page.tsx (ver docs/decisoes.md, "Extração síncrona em vez
// de polling") — a lógica em si é uma função pura o bastante para trocar por
// fila/polling depois sem reescrever nada aqui.
export async function processarFonteDados(
  supabase: SupabaseClient<Database>,
  empresaId: string,
  fonte: FonteParaProcessar,
): Promise<StatusFonteDados> {
  if (fonte.tipo === 'instagram') {
    await supabase.from('fonte_dados').update({ status: 'nao_configurado' }).eq('id', fonte.id);
    return 'nao_configurado';
  }

  if (fonte.tipo === 'manual') {
    // O formulário manual grava campo_extraido diretamente; nada a extrair aqui.
    return 'pendente';
  }

  if (!fonte.url) {
    await supabase.from('fonte_dados').update({ status: 'erro' }).eq('id', fonte.id);
    return 'erro';
  }

  const inicio = Date.now();
  try {
    const dados = await buscarDadosGoogle(fonte.url);
    if (!dados) {
      await supabase.from('fonte_dados').update({ status: 'erro' }).eq('id', fonte.id);
      return 'erro';
    }

    let usoIA: UsoTokens | null = null;
    const resultado = await estruturarEmpresa({
      origem: 'google',
      dadosBrutos: dados,
      aoUsarIA: (uso) => {
        usoIA = uso;
      },
    });
    await gravarCamposExtraidos(supabase, empresaId, resultado);

    await supabase
      .from('fonte_dados')
      .update({ status: 'ok', bruto: dados, coletado_em: new Date().toISOString() })
      .eq('id', fonte.id);

    const uso: UsoTokens | null = usoIA;
    const base = { fonte: 'google', duracaoMs: Date.now() - inicio };
    await supabase.from('evento_produto').insert({
      empresa_id: empresaId,
      tipo: 'extracao_concluida',
      payload: uso !== null ? payloadComUso(base, uso) : base,
    });
    return 'ok';
  } catch (erro) {
    console.error('Falha ao processar fonte de dados do Google:', erro);
    await supabase.from('fonte_dados').update({ status: 'erro' }).eq('id', fonte.id);
    return 'erro';
  }
}
