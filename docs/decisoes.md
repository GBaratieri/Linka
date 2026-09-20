# Decisões técnicas

Registro de decisões de detalhe tomadas durante o desenvolvimento (regra 6 do `CLAUDE.md`):
dúvidas de escopo são perguntadas antes de implementar; dúvidas de detalhe são decididas, registradas
aqui e seguidas.

## Fase 0

- **Nome do pacote (`package.json`)**: o diretório do projeto (`Criador_de_site`) tem letra
  maiúscula, o que viola as regras de nomenclatura do npm. O campo `name` do `package.json` foi
  definido como `sitelink`, sem relação com o nome da pasta no disco.
- **`"type": "module"` no `package.json`**: adicionado para eliminar avisos do Vite/Vitest sobre
  carregar um arquivo de configuração ESM (`vitest.config.ts`) como CommonJS. Next.js e as demais
  ferramentas do projeto funcionam normalmente em modo ESM.
- **Ambiente de teste do Vitest**: configurado com `environment: "jsdom"` e
  `@testing-library/react` desde a Fase 0, mesmo sem telas reais ainda, porque a partir da Fase 1
  o projeto passa a ter componentes de UI e formulários — configurar o ambiente de testes de
  componentes agora evita retrabalho.
- **`next typegen` no script `typecheck`**: o Next.js 16 gera tipos de rota (`LayoutProps`,
  `PageProps`, etc.) em `.next/types`, uma pasta ignorada pelo git. Sem gerá-los antes, `tsc
--noEmit` falha em uma instalação nova (ex.: logo após `git clone`). O script `typecheck` agora
  roda `next typegen && tsc --noEmit` para ser reprodutível.
- **`agentRules: false` em `next.config.ts`**: o Next.js 16 (`next dev`/`next build`) tenta
  injetar automaticamente um bloco de instruções para agentes de IA dentro do `CLAUDE.md` do
  projeto. Como o `CLAUDE.md` aqui é o documento de instruções mantido manualmente pelo usuário
  (não um arquivo gerado), essa opção foi desativada para que o arquivo nunca seja reescrito por
  ferramentas automatizadas.
- **Prettier não formata `CLAUDE.md`**: adicionado a `.prettierignore` pelo mesmo motivo acima —
  é um documento do usuário, não código do projeto.
- **`.env.example` com exceção no `.gitignore`**: o padrão `.env*` gerado pelo `create-next-app`
  também bloquearia o `.env.example`. Foi adicionada a regra `!.env.example` logo em seguida para
  garantir que o arquivo de exemplo continue versionado.

## Fase 1

- **`empresa.nome`, `segmento` e `cidade` são opcionais na criação**: na tela `/novo` o usuário só
  cola um link — ainda não sabemos o nome real, o segmento ou a cidade da empresa. Preencher esses
  campos agora seria inventar dado (regra 2 do CLAUDE.md). Eles ficam `null` até a extração
  (Fase 2) confirmá-los.
- **Enums como `text` + `check`, não `enum` nativo do Postgres**: facilita adicionar um valor novo
  no futuro (só migrar o `check`, sem `alter type ... add value` e suas restrições transacionais).
- **Aceite de LGPD guardado via `raw_user_meta_data` do `auth.users`**: o cadastro envia
  `aceitou_lgpd: true` como metadado do `signUp`, e o trigger `handle_new_user` já grava
  `aceitou_lgpd_em` na criação da linha em `public.usuario`. Evita depender de uma sessão ativa
  logo após o cadastro (que pode não existir se o projeto Supabase exigir confirmação de e-mail).
- **Cadastro sem sessão → redireciona para `/login?cadastro=pendente`**: quando o Supabase exige
  confirmação de e-mail, `signUp` não retorna sessão. Em vez de mandar para `/novo` (que bateria no
  middleware/proxy e voltaria para `/login` sem explicação), a tela de login mostra um aviso.
- **Tipos do banco (`lib/supabase/tipos-banco.ts`) escritos à mão, parciais**: sem um projeto
  Supabase real não é possível rodar `supabase gen types typescript`. O tipo `Database` cobre só as
  tabelas que o código já usa (`usuario`, `empresa`, `fonte_dados`, `evento_pesquisa`); as demais
  entram conforme cada fase passar a consultá-las. Cada tabela precisa de `Relationships: []` e o
  schema precisa de `Views`/`Functions` (mesmo vazios) para satisfazer o tipo `GenericSchema` do
  `@supabase/postgrest-js` — sem isso o TypeScript infere `never` nas consultas.
- **SSRF (`lib/seguranca/ssrf.ts`)**: defesa em camadas — lista de hosts permitidos (só
  Instagram/Google Maps e seus encurtadores), rejeição de IPs literais, resolução DNS com bloqueio
  de IPs privados/reservados (inclusive `169.254.169.254`, metadado de nuvem), timeout via
  `AbortController` e redirecionamento manual (`redirect: 'manual'`) revalidando host e IP a cada
  salto, com limite de saltos. Só fica pronta para uso real na Fase 2 (resolução de links curtos do
  Google); aqui já vem coberta por testes.
- **`middleware.ts` renomeado para `proxy.ts`**: o Next.js 16 depreciou a convenção `middleware` em
  favor de `proxy` (mesmo formato de `config.matcher`, função renomeada de `middleware` para
  `proxy`). Migração mecânica, sem mudança de comportamento.
- **Sem Docker/Supabase CLI neste ambiente**: não foi possível subir um Postgres local nem rodar as
  migrações de verdade. A Fase 1 foi validada com: testes unitários/integração com o cliente
  Supabase mockado (`tests/integration/criarEmpresa.test.ts`), teste manual das telas no navegador
  contra um `.env.local` com valores fictícios (confirma renderização, validação client/servidor e
  tratamento de erro amigável quando a chamada ao Supabase falha) e revisão manual do SQL de
  migração (RLS e trigger). O fluxo completo (cadastro → login → criação de empresa) só pode ser
  confirmado ponta a ponta com um projeto Supabase real.
- **Lógica de criação de empresa separada da server action**: `lib/conectores/criarEmpresa.ts`
  recebe um cliente Supabase já pronto e retorna um resultado (`{ sucesso, ... }`), sem chamar
  `redirect()`. A server action (`app/novo/actions.ts`) só lê o `FormData`, resolve o usuário
  autenticado e decide para onde redirecionar. Isso permite testar a lógica de criação com um
  cliente Supabase mockado, sem precisar simular o mecanismo de `redirect()` do Next.js.

## Revisão de código (pós-Fase 1)

Revisão completa do código das Fases 0 e 1 (8 ângulos: linha a linha, invariantes/guards,
rastreamento entre arquivos, reuso, simplificação, eficiência, altitude e conformidade com o
`CLAUDE.md`). 8 problemas de corretude encontrados e corrigidos:

- **`proxy.ts`**: os redirects (`/login`, `/novo`) criavam uma resposta nova sem copiar os cookies
  que o Supabase pode ter renovado na mesma requisição (via `setAll`) — corrigido com um helper
  `comCookiesDe` que copia os cookies antes de redirecionar.
- **Checkbox de LGPD** (`lib/schemas/auth.ts`): checkbox desmarcado manda `null` (não `undefined`)
  no `FormData`; `z.string().optional()` só cobre `undefined`, então o Zod mostrava um erro
  genérico em inglês em vez da mensagem em pt-BR. Trocado para `.nullish()`.
- **`criarEmpresa.ts`**: o erro do insert em `evento_pesquisa` (métrica do TCC) não era checado —
  agora é logado (sem bloquear o fluxo, já que é telemetria, não dado essencial do usuário).
- **`criarEmpresa.ts`**: se o insert de `fonte_dados` falhasse depois do de `empresa`, a empresa
  ficava órfã para sempre — agora a empresa é removida (rollback manual) nesse caso.
- **`acaoManual`** (`app/novo/actions.ts`): em caso de erro, só redirecionava de volta pro `/novo`
  sem nenhuma mensagem. Agora segue o mesmo padrão de `useActionState` do `acaoLink`, mostrando o
  erro no formulário.
- **`ssrf.ts`**: o allowlist aceitava qualquer caminho em `google.com`/`www.google.com`, mas o
  roteador só considera válido um link desses hosts quando o caminho começa com `/maps`. Adicionada
  `caminhoPermitidoParaHost`, replicando a mesma regra (com comentário apontando a necessidade de
  manter as duas em sincronia até uma futura unificação).
- **`auth.ts`**: schemas de cadastro/login não tinham limite máximo de tamanho em nome/e-mail/senha
  (diferente do link, que já tinha um cap de 2048 caracteres). Adicionados `.max()` em todos os
  campos de texto livre.
- **`empresa/[id]/page.tsx`**: o `id` da URL ia direto pra query sem validar formato, e o erro do
  Supabase era descartado (só verificava se a empresa veio vazia). Adicionada validação de formato
  UUID antes de consultar, e o erro da consulta agora também é checado.

Dois achados de limpeza (não corrigidos ainda, ficam para quando fizerem sentido): duplicação do
padrão "pega usuário autenticado ou redireciona pro login" em 3 lugares (`novo/actions.ts` x2,
`empresa/[id]/page.tsx`), e os tipos `Insert`/`Update` em `tipos-banco.ts` reescritos à mão em vez
de derivados de `Row` via `Omit`/`Partial`.
