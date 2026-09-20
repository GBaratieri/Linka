// Estima o custo em reais de uma chamada de IA a partir dos tokens
// consumidos, para registrar em evento_produto (seção 8.6 do CLAUDE.md) e
// permitir limites de gasto por conta/dia mais adiante. Preços em USD por
// 1 milhão de tokens — conferir a tabela vigente em
// https://www.anthropic.com/pricing antes de usar em produção; não há como
// validar isso automaticamente contra a API.
interface PrecoModelo {
  entradaPorMilhao: number;
  saidaPorMilhao: number;
}

const PRECOS_USD_POR_MILHAO: Record<string, PrecoModelo> = {
  'claude-sonnet-5': { entradaPorMilhao: 3, saidaPorMilhao: 15 },
  'claude-haiku-4-5-20251001': { entradaPorMilhao: 1, saidaPorMilhao: 5 },
};

// Modelo desconhecido (ex.: variável de ambiente apontando para um modelo
// novo ainda não cadastrado acima): usa o preço do Sonnet como estimativa
// conservadora, em vez de falhar a extração por causa de uma métrica.
const PRECO_PADRAO: PrecoModelo = PRECOS_USD_POR_MILHAO['claude-sonnet-5'];

export interface UsoTokens {
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
}

export function custoEstimadoEmReais({ modelo, tokensEntrada, tokensSaida }: UsoTokens): number {
  const preco = PRECOS_USD_POR_MILHAO[modelo] ?? PRECO_PADRAO;
  const usdBrl = Number(process.env.USD_BRL) || 5.5;

  const custoUsd =
    (tokensEntrada / 1_000_000) * preco.entradaPorMilhao +
    (tokensSaida / 1_000_000) * preco.saidaPorMilhao;

  return Number((custoUsd * usdBrl).toFixed(4));
}

// Recebe `uso` como parâmetro comum (não uma variável fechada/reatribuída em
// closure) de propósito: com `strict` ligado, o TypeScript não consegue
// estreitar corretamente `T | null` para spread quando a variável já foi
// reatribuída dentro de um callback assíncrono — construir o payload aqui,
// a partir de um parâmetro já não-nulo, evita o problema.
export function payloadComUso(
  base: Record<string, unknown>,
  uso: UsoTokens,
): Record<string, unknown> {
  return { ...base, ...uso, custoEstimadoReais: custoEstimadoEmReais(uso) };
}
