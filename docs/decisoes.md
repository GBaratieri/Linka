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
