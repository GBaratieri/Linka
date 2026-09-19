# SiteLink

Plataforma web (MVP de TCC) que gera uma landing page para uma microempresa brasileira a partir
de um único link (Instagram ou Google). Veja a missão completa e as regras do projeto em
[`CLAUDE.md`](./CLAUDE.md).

## Stack

Next.js (App Router) + TypeScript (strict) + Tailwind CSS, Supabase (Postgres + Auth + Storage),
Zod, SDK oficial da Anthropic, Google Places API (New), Vitest e Playwright (E2E, a partir da
Fase 5).

## Como rodar

Pré-requisitos: Node.js 20+ e npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Com `USE_MOCKS=true` (padrão do `.env.example`) o projeto roda sem nenhuma credencial externa,
usando fixtures no lugar das chamadas reais a Supabase/Google/Anthropic.

## Scripts

| Script                 | Descrição                                              |
| ---------------------- | ------------------------------------------------------ |
| `npm run dev`          | Sobe o servidor de desenvolvimento (Turbopack)         |
| `npm run build`        | Build de produção                                      |
| `npm run start`        | Sobe o build de produção                               |
| `npm run lint`         | ESLint                                                 |
| `npm run typecheck`    | Gera os tipos de rota do Next.js e roda `tsc --noEmit` |
| `npm run test`         | Testes unitários/integração (Vitest)                   |
| `npm run format`       | Formata o projeto com Prettier                         |
| `npm run format:check` | Verifica formatação sem alterar arquivos               |

## Configurando as integrações externas

Copie `.env.example` para `.env.local` e preencha conforme necessário. Nenhuma dessas chaves é
obrigatória para rodar em modo mock (`USE_MOCKS=true`).

- **Supabase** — crie um projeto em [supabase.com](https://supabase.com), copie a URL e as chaves
  em Project Settings → API para `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
  `SUPABASE_SERVICE_ROLE_KEY`. As migrações ficam em [`supabase/migrations`](./supabase/migrations)
  — veja o [README da pasta](./supabase/README.md) para aplicá-las.
- **Google Places API (New)** — habilite a API no Google Cloud Console e gere uma chave para
  `GOOGLE_PLACES_API_KEY`. Mantenha `GOOGLE_SHOW_REVIEWS` e `GOOGLE_SHOW_PHOTOS` como `false` até
  revisar os termos de uso vigentes da API para exibição desses dados.
- **Anthropic** — gere uma chave em [console.anthropic.com](https://console.anthropic.com) para
  `ANTHROPIC_API_KEY`. O modelo usado vem de `ANTHROPIC_MODEL` (nunca fixo no código).

Sem essas chaves, deixe `USE_MOCKS=true` e o sistema usa fixtures determinísticas.

## Estrutura do projeto

```
src/
  app/          # rotas (App Router)
  lib/          # conectores, IA, schemas, componentes de site, segurança, métricas
supabase/
  migrations/   # migrações SQL do Postgres (Supabase)
tests/
  unit/         # testes unitários/integração (Vitest)
docs/
  decisoes.md   # decisões técnicas registradas ao longo do projeto
  fases/        # relatório de cada fase de desenvolvimento
```

## Documentação

- [`CLAUDE.md`](./CLAUDE.md) — missão, regras, stack, arquitetura e fases do projeto.
- [`docs/decisoes.md`](./docs/decisoes.md) — decisões técnicas de detalhe, registradas conforme
  surgem dúvidas de escopo.
- [`docs/fases/`](./docs/fases) — relatório de entrega de cada fase.
