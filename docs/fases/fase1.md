# Fase 1 — Banco, login e entrada do link

## O que foi feito

- **Migração do esquema de domínio** (`supabase/migrations/20260919120000_esquema_dominio.sql`):
  as 10 tabelas da seção 5 do `CLAUDE.md` (`usuario`, `empresa`, `fonte_dados`, `campo_extraido`,
  `template`, `site`, `versao_site`, `evento_metrica`, `evento_pesquisa`, `feedback`), todas com
  `id uuid`, `criado_em timestamptz`, RLS habilitado e políticas por dono (via `usuario_id` direto
  ou por `exists (...)` até `empresa`/`site`). `template` tem leitura pública (tabela de
  referência); `evento_metrica` só tem política de leitura (a escrita é feita pela service role no
  `/api/track`, na Fase 4). Trigger `handle_new_user` cria a linha em `public.usuario` a partir de
  `auth.users`, já gravando `aceitou_lgpd_em` quando o cadastro indicou aceite.
- **Autenticação (Supabase Auth)**: telas `/cadastro` e `/login` com Server Actions
  (`entrar`, `cadastrar`), validação com Zod (`lib/schemas/auth.ts`), checkbox obrigatório de
  aceite de LGPD com link para `/privacidade`. `/privacidade` com texto simples explicando quais
  dados são coletados, para que servem e como pedir exclusão.
- **`lib/conectores/roteador.ts`**: identifica se um link é do Instagram ou do Google Maps
  (incluindo `maps.app.goo.gl`, `g.page`, `share.google`) só pela URL, sem requisição de rede.
  29 casos de teste (13 válidos, 16 inválidos/maliciosos) em `tests/unit/roteador.test.ts`.
- **`lib/seguranca/ssrf.ts`**: proteção contra SSRF para uso na Fase 2 (resolução de links curtos)
  — lista de hosts permitidos, bloqueio de IPs privados/reservados (com resolução DNS), timeout e
  limite de redirecionamentos revalidando cada salto. 34 testes em `tests/unit/ssrf.test.ts`.
- **Tela `/novo`**: campo único para colar o link + botão "Não tenho link, quero preencher
  manualmente". Ao enviar, cria uma `empresa` (dados ainda `null`, preenchidos na Fase 2) e uma
  `fonte_dados` com `status = 'pendente'`, e registra o evento de pesquisa `link_colado`. Redireciona
  para `/empresa/[id]`, uma tela provisória confirmando a criação (a revisão de verdade é a
  Fase 2).
- **`src/proxy.ts`** (convenção `proxy` do Next.js 16, substituindo `middleware`): renova a sessão
  do Supabase a cada requisição e protege `/novo`, `/empresa` e `/painel` (redireciona para
  `/login` sem sessão) e `/login`/`/cadastro` (redireciona para `/novo` já logado).
- **Tipos do banco** (`lib/supabase/tipos-banco.ts`): tipagem manual das tabelas já usadas pelo
  código (ver `docs/decisoes.md`).

## Decisões

Ver a seção "Fase 1" em [`docs/decisoes.md`](../decisoes.md).

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha com um projeto Supabase real para testar de verdade
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

## Resultado dos checks (nesta máquina)

- `npm run lint` — sem erros.
- `npm run typecheck` — sem erros.
- `npm run test` — 4 arquivos, 69 testes, todos passando (29 do roteador, 34 do SSRF, 5 da criação
  de empresa mockada, 1 da página inicial).
- `npm run build` — build de produção concluído com sucesso (com um `.env.local` de valores
  fictícios — ver pendências).

## Pendências / próximos passos

- **Sem Supabase real neste ambiente**: não há Docker/Supabase CLI disponíveis aqui, então não foi
  possível aplicar a migração num Postgres de verdade nem confirmar ponta a ponta o critério de
  aceite "usuário cria conta, entra e cria uma empresa com uma fonte_dados pendente". O que foi
  verificado nesta máquina:
  - Testes automatizados cobrindo a lógica de criação de empresa/fonte de dados com um cliente
    Supabase mockado (`tests/integration/criarEmpresa.test.ts`).
  - Todas as telas testadas manualmente no navegador contra um `.env.local` com valores fictícios
    (`https://placeholder.supabase.co`): formulários renderizam, validação client-side (campo
    obrigatório, checkbox de LGPD) e server-side (Zod) funcionam, e o erro da chamada real ao
    Supabase (que falha, por ser fictício) aparece como mensagem amigável em vez de quebrar a
    página. O `proxy` redireciona corretamente `/novo` → `/login` sem sessão.
  - Revisão manual do SQL da migração (RLS, políticas, trigger).
  - **Para validar de verdade**: crie um projeto em [supabase.com](https://supabase.com), rode as
    migrações (`supabase/README.md`) e preencha `NEXT_PUBLIC_SUPABASE_URL` /
    `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`. Nenhuma chave
    foi pedida a você nem usada nesta fase.
- Se o projeto Supabase tiver confirmação de e-mail ativada, o cadastro não gera sessão imediata;
  o usuário é levado para `/login` com um aviso. Isso ainda não foi testado contra um projeto real.
- A tela `/empresa/[id]` criada aqui é só uma confirmação provisória; a Fase 2 substitui pelo fluxo
  de extração e pela tela de revisão de verdade.

---

**Fase 1 concluída — aguardando aprovação.**
