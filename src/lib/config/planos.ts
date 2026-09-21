// Limites por plano (seção 1 do CLAUDE.md). As tabelas `plano`/`assinatura`
// só chegam na Fase 7 — até lá, todo mundo roda com o limite do plano
// Essencial, aqui como valor de configuração isolado (fácil de trocar por
// uma consulta de verdade quando a Fase 7 chegar, sem mexer em quem usa
// isso).
export const LIMITE_GERACOES_POR_MES = 5;
