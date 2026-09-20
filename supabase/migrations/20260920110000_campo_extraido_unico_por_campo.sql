-- Evita linhas duplicadas em campo_extraido para o mesmo campo da mesma
-- empresa (Fase 2, correção de bug: reenvio do formulário manual duplicava
-- campo_extraido por falta de checagem de linha existente). Junto com o
-- upsert em lib/conectores/normalizador.ts (gravarCampos), garante que
-- reenvios do formulário ou corridas simultâneas atualizem a linha existente
-- em vez de criar outra.
alter table public.campo_extraido
  add constraint campo_extraido_empresa_campo_key unique (empresa_id, campo);
