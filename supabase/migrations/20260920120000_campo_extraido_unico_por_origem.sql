-- A Fase 2 original guardava só o valor vencedor por campo (um único
-- registro por campo_extraido.campo, resolvido no momento da gravação). O
-- Verificador de consistência (Fase 2 do CLAUDE.md v2) precisa comparar o
-- valor de cada fonte separadamente — troca a constraint única de
-- (empresa_id, campo) para (empresa_id, campo, origem), permitindo uma
-- linha por origem para o mesmo campo. A resolução de conflito (qual valor
-- é "efetivo") passa a acontecer na leitura, não mais na gravação — ver
-- calcularValoresEfetivos em lib/conectores/normalizador.ts.
alter table public.campo_extraido
  drop constraint campo_extraido_empresa_campo_key;

alter table public.campo_extraido
  add constraint campo_extraido_empresa_campo_origem_key unique (empresa_id, campo, origem);
