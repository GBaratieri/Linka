import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import type { Segmento } from '@/lib/schemas/empresa';
import type { PedidoEstilo } from '@/lib/schemas/estilo';
import { calcularValoresEfetivos, montarEmpresaNormalizada } from '@/lib/conectores/normalizador';
import { gerarEstilo } from '@/lib/ia/estilo';
import { gerarTextos } from '@/lib/ia/textos';
import { verificarConteudo, sanitizarConteudo } from '@/lib/ia/guardas';
import { corrigirContraste } from '@/lib/site/tema';
import { payloadComUso, type UsoTokens } from '@/lib/metricas/custos';
import { LIMITE_GERACOES_POR_MES } from '@/lib/config/planos';
import { inicioDoMesNoFusoDoNegocio } from '@/lib/site/fuso';

export type ResultadoGeracaoSite =
  | { sucesso: true; siteId: string }
  | { sucesso: false; erro: string };

// Código do Postgres para violação de constraint única (unique_violation) —
// mesmo usado em conectores/adicionarFonte.ts.
const CODIGO_ERRO_UNICIDADE = '23505';

// Conta quantas gerações essa empresa já usou no mês corrente (seção 9 do
// CLAUDE.md: evento site_gerado), pra aplicar o limite do plano (seção 1) —
// ainda com o valor fixo do plano Essencial, até a Fase 7 ter planos de
// verdade (ver lib/config/planos.ts).
async function geracoesUsadasNoMes(
  supabase: SupabaseClient<Database>,
  empresaId: string,
): Promise<number> {
  const inicioDoMes = inicioDoMesNoFusoDoNegocio();

  const { data } = await supabase
    .from('evento_produto')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('tipo', 'site_gerado')
    .gte('criado_em', inicioDoMes.toISOString());

  return data?.length ?? 0;
}

// Orquestra a Fase 3 inteira: gera o estilo, corrige o contraste, redige os
// textos, passa pela guarda anti-alucinação (com uma nova tentativa se
// reprovar, e um saneamento como último recurso), resolve as seções do
// template e grava uma nova versao_site. Roda de forma síncrona, a exemplo
// da extração da Fase 2 (ver docs/decisoes.md) — mock é instantâneo; a IA
// real deve levar no máximo alguns segundos.
export async function gerarNovaVersaoDoSite(
  supabase: SupabaseClient<Database>,
  empresaId: string,
  pedido: PedidoEstilo,
): Promise<ResultadoGeracaoSite> {
  const usadas = await geracoesUsadasNoMes(supabase, empresaId);
  if (usadas >= LIMITE_GERACOES_POR_MES) {
    return {
      sucesso: false,
      erro: `Você já usou as ${LIMITE_GERACOES_POR_MES} gerações incluídas no seu plano este mês.`,
    };
  }

  // As duas consultas abaixo não dependem uma da outra — buscar em paralelo
  // poupa uma volta ao banco em toda geração (um caminho síncrono e visível
  // pro usuário, ver comentário no fim da função).
  const [{ data: empresaRow, error: erroEmpresa }, { data: linhas, error: erroLinhas }] = await Promise.all([
    supabase.from('empresa').select('segmento, cidade').eq('id', empresaId).single(),
    supabase
      .from('campo_extraido')
      .select('campo, valor, origem, confianca, editado_pelo_usuario')
      .eq('empresa_id', empresaId)
      .order('criado_em', { ascending: true }),
  ]);
  if (erroEmpresa || !empresaRow || erroLinhas) {
    return { sucesso: false, erro: 'Não foi possível carregar os dados da empresa.' };
  }
  const segmento = (empresaRow.segmento as Segmento | null) ?? 'outro';
  const empresaNormalizada = montarEmpresaNormalizada(calcularValoresEfetivos(linhas ?? []));

  const inicio = Date.now();
  let usoTotal: UsoTokens | null = null;
  const somarUso = (uso: UsoTokens) => {
    usoTotal =
      usoTotal === null
        ? uso
        : {
            modelo: uso.modelo,
            tokensEntrada: usoTotal.tokensEntrada + uso.tokensEntrada,
            tokensSaida: usoTotal.tokensSaida + uso.tokensSaida,
          };
  };

  try {
    // Dentro do try (não antes): uma falha de rede aqui não pode virar uma
    // exceção não tratada — precisa do mesmo erro amigável que o resto da
    // função já garante.
    await supabase.from('evento_produto').insert({
      empresa_id: empresaId,
      tipo: 'estilo_enviado',
      payload: { texto: pedido.texto, caracteres: pedido.texto.length },
    });

    const estiloGerado = await gerarEstilo({
      texto: pedido.texto,
      segmento,
      referencia: pedido.referencia,
      aoUsarIA: somarUso,
    });
    const estilo = { ...estiloGerado, paleta: corrigirContraste(estiloGerado.paleta) };

    let conteudo = await gerarTextos({
      empresa: empresaNormalizada,
      cidade: empresaRow.cidade,
      tomDeVoz: estilo.tom_de_voz,
      aoUsarIA: somarUso,
    });
    let tentativaExtra = false;

    if (!verificarConteudo(conteudo, empresaNormalizada).aprovado) {
      tentativaExtra = true;
      conteudo = await gerarTextos({
        empresa: empresaNormalizada,
        cidade: empresaRow.cidade,
        tomDeVoz: estilo.tom_de_voz,
        aoUsarIA: somarUso,
      });
      if (!verificarConteudo(conteudo, empresaNormalizada).aprovado) {
        conteudo = sanitizarConteudo(conteudo, empresaNormalizada);
      }
    }

    const { data: template } = await supabase
      .from('template')
      .select('id, componentes')
      .eq('segmento', segmento)
      .limit(1)
      .maybeSingle();
    // "outro" não tem template próprio (seção "Fase 3" do CLAUDE.md só pede
    // 3 templates-base) — cai no de serviços.
    const templateResolvido =
      template ??
      (
        await supabase
          .from('template')
          .select('id, componentes')
          .eq('segmento', 'servicos')
          .limit(1)
          .single()
      ).data;
    if (!templateResolvido) {
      return { sucesso: false, erro: 'Não foi possível encontrar um template para o site.' };
    }

    let { data: site } = await supabase
      .from('site')
      .select('id')
      .eq('empresa_id', empresaId)
      .limit(1)
      .maybeSingle();
    if (!site) {
      const { data: novoSite, error: erroSite } = await supabase
        .from('site')
        .insert({ empresa_id: empresaId })
        .select('id')
        .single();
      if (erroSite?.code === CODIGO_ERRO_UNICIDADE) {
        // Duas chamadas concorrentes (ex.: duplo clique em "Gerar meu site")
        // podem ter passado pelo select acima antes de qualquer uma inserir
        // — a constraint única (site_empresa_id_key) barra a segunda, que
        // busca de novo o site que a primeira acabou de criar em vez de
        // falhar (mesmo padrão de adicionarFonte.ts para fonte_dados).
        const { data: siteDaOutraChamada } = await supabase
          .from('site')
          .select('id')
          .eq('empresa_id', empresaId)
          .single();
        if (!siteDaOutraChamada) {
          return { sucesso: false, erro: 'Não foi possível criar o site. Tente novamente.' };
        }
        site = siteDaOutraChamada;
      } else if (erroSite || !novoSite) {
        return { sucesso: false, erro: 'Não foi possível criar o site. Tente novamente.' };
      } else {
        site = novoSite;
      }
    }

    const { error: erroVersao } = await supabase.from('versao_site').insert({
      site_id: site.id,
      template_id: templateResolvido.id,
      estilo_texto: pedido.texto,
      estilo_config: estilo,
      conteudo,
    });
    if (erroVersao) {
      return { sucesso: false, erro: 'Não foi possível salvar o site gerado. Tente novamente.' };
    }

    const uso: UsoTokens | null = usoTotal;
    const base = { duracaoMs: Date.now() - inicio, tentativaExtra };
    await supabase.from('evento_produto').insert({
      empresa_id: empresaId,
      tipo: 'site_gerado',
      payload: uso !== null ? payloadComUso(base, uso) : base,
    });

    return { sucesso: true, siteId: site.id };
  } catch (erro) {
    console.error('Falha ao gerar o site:', erro);
    return {
      sucesso: false,
      erro: 'Não foi possível gerar o site agora. Tente novamente em instantes.',
    };
  }
}
