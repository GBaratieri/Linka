// A Fase 3 não tem nenhuma fonte de dados de perguntas/respostas (nem
// EmpresaNormalizada nem ConteudoSite carregam isso) — gerar perguntas
// genéricas "de negócio" sem base nos dados reais da empresa violaria a
// regra de nunca inventar dado (regra 2 do CLAUDE.md). Por isso a seção,
// listada como "(opcional)" no CLAUDE.md, fica sempre omitida por
// enquanto — ver docs/decisoes.md.
export function FAQ() {
  return null;
}
