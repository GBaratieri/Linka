-- Fase 3 (caixa de estilo, geração e prévia): ajusta site e versao_site
-- para o que a v2 do CLAUDE.md precisa. As duas tabelas já existiam desde a
-- migração original da Fase 1 (no modelo do CLAUDE.md v1, que criava todas
-- as tabelas de uma vez só) — esta migração só faz os ajustes:
--
--   * site.subdominio vira opcional: uma versão em rascunho (gerada e
--     revisada na prévia desta fase) ainda não tem subdomínio — a
--     reivindicação de verdade só acontece na Fase 4 (publicação). O
--     modelo de dados da v2 já lista `site` como tabela usada a partir da
--     Fase 3 (por causa do FK de versao_site), então a linha em status
--     'rascunho' precisa poder existir sem subdomínio ainda.
--   * site.status ganha 'suspenso' (terceiro valor previsto na seção 6 da
--     v2, usado só na Fase 7 pra inadimplência — mas o check já cobre
--     desde já).
--   * versao_site ganha nota_qualidade (usada de fato só na Fase 6, mas já
--     faz parte da definição da tabela na seção 6 da v2).
alter table public.site alter column subdominio drop not null;

alter table public.site drop constraint site_status_check;
alter table public.site add constraint site_status_check
  check (status in ('rascunho', 'publicado', 'suspenso'));

alter table public.versao_site
  add column nota_qualidade smallint check (nota_qualidade between 0 and 100);
