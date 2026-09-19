# Supabase

Migrações SQL do banco Postgres usado pelo projeto (Auth, tabelas de domínio e Storage).

## Aplicando as migrações

1. Crie um projeto em [supabase.com](https://supabase.com) (ou rode o Supabase localmente com a
   [CLI oficial](https://supabase.com/docs/guides/cli)).
2. Preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
   `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` (veja `.env.example` na raiz).
3. Com a [CLI do Supabase](https://supabase.com/docs/guides/cli/getting-started) instalada:

   ```bash
   supabase link --project-ref <ref-do-projeto>
   supabase db push
   ```

   Ou aplique os arquivos de `migrations/` manualmente pelo SQL Editor do painel do Supabase, em
   ordem cronológica pelo nome do arquivo.

## Convenções

- Uma migração por mudança de esquema, nomeada `<timestamp>_<descricao-curta>.sql`.
- Toda tabela nova tem `id uuid` e `criado_em timestamptz default now()`.
- RLS (`Row Level Security`) é ativado em toda tabela nova, com políticas por dono
  (`usuario_id = auth.uid()`). Veja a seção 5 do `CLAUDE.md` na raiz do projeto para o modelo de
  dados completo.
