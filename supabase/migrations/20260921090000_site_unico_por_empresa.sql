-- Uma empresa tem no máximo um site (o fluxo do produto gera versões dentro
-- dele, nunca sites paralelos) — sem essa constraint, duas chamadas
-- concorrentes a gerarNovaVersaoDoSite (ex.: duplo clique em "Gerar meu
-- site") podiam ambas encontrar nenhum site existente e inserir duas linhas
-- para a mesma empresa (mesma classe de corrida já corrigida em
-- fonte_dados, ver 20260920140000_fonte_dados_unica_por_tipo.sql).
alter table public.site
  add constraint site_empresa_id_key unique (empresa_id);
