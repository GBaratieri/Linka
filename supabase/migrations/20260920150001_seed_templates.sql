-- Semeia os 3 templates-base da Fase 3 (seção "Fase 3" do CLAUDE.md). Vai
-- numa migração (não em supabase/seed.sql) porque são dados de referência
-- que a aplicação depende estruturalmente existirem em todo ambiente, não
-- dados de conveniência só para desenvolvimento local.
--
-- "outro" (o segmento de fallback, fora dos 3 pedidos pelo CLAUDE.md) usa o
-- template de serviços como base — decisão de detalhe registrada em
-- docs/decisoes.md.
insert into public.template (segmento, nome, componentes) values
  (
    'servicos',
    'Serviços',
    '["hero","servicos","prova_social","sobre","localizacao","contato","faq"]'::jsonb
  ),
  (
    'comercio',
    'Comércio',
    '["hero","galeria","servicos","prova_social","sobre","localizacao","contato"]'::jsonb
  ),
  (
    'alimentacao',
    'Alimentação',
    '["hero","galeria","servicos","prova_social","localizacao","contato","faq"]'::jsonb
  );
