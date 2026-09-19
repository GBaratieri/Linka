# Fase 0 — Fundação

## O que foi feito

- Projeto Next.js 16 (App Router) + TypeScript strict + Tailwind CSS 4, criado com
  `create-next-app` e ajustado para o layout de pastas do projeto (`src/app`, alias `@/*`).
- ESLint (`eslint-config-next`) integrado com Prettier via `eslint-config-prettier`, sem conflito
  de regras de formatação.
- Prettier configurado (`.prettierrc.json`, `.prettierignore`), excluindo `CLAUDE.md` (documento
  do usuário) da formatação automática.
- Vitest configurado com ambiente `jsdom` e `@testing-library/react` (já preparado para testes de
  componentes a partir da Fase 1+), com um teste de exemplo (`tests/unit/home-page.test.tsx`)
  cobrindo a página inicial.
- Scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `format`, `format:check` no
  `package.json`.
- Página inicial (`src/app/page.tsx`) e metadados (`src/app/layout.tsx`) trocados pelo placeholder
  em pt-BR do SiteLink (`lang="pt-BR"`), no lugar do conteúdo padrão do `create-next-app`.
- `.env.example` com todas as variáveis da seção 3 do `CLAUDE.md`; `.gitignore` ajustado para
  ignorar `.env*` mas manter `.env.example` versionado.
- `README.md` reescrito em pt-BR com instruções de instalação, scripts e configuração das
  integrações externas (Supabase, Google Places, Anthropic).
- `docs/decisoes.md` criado, já com as decisões de detalhe tomadas nesta fase.
- `supabase/migrations/00000000000000_inicial.sql` (migração vazia, placeholder) e
  `supabase/README.md` com instruções de como aplicar migrações.
- `next.config.ts`: `agentRules: false`, para impedir que `next dev`/`next build` reescrevam o
  `CLAUDE.md` do projeto (comportamento padrão do Next.js 16 — ver `docs/decisoes.md`).

## Decisões

Ver [`docs/decisoes.md`](../decisoes.md).

## Como rodar

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm run test
npm run build
```

## Resultado dos checks (nesta máquina)

- `npm run lint` — sem erros.
- `npm run typecheck` — sem erros (`next typegen && tsc --noEmit`).
- `npm run test` — 1 arquivo, 1 teste, passando.
- `npm run build` — build de produção concluído com sucesso.
- `npm run dev` — sobe em `http://localhost:3000`, retorna HTTP 200.

## Pendências / próximos passos

- Nenhuma credencial de Supabase, Google ou Anthropic foi solicitada ou usada nesta fase — todo o
  setup funciona com `USE_MOCKS=true` e nenhuma chamada externa é feita ainda.
- As tabelas do banco (seção 5 do `CLAUDE.md`), autenticação, RLS e a tela `/novo` ficam para a
  Fase 1.
- A migração inicial em `supabase/migrations/` está vazia de propósito; o esquema real entra na
  Fase 1.

---

**Fase 0 concluída — aguardando aprovação.**
