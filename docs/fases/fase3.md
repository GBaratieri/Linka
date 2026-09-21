# Fase 3 — Caixa de estilo, geração e prévia

## O que foi feito

- **Tela `/empresa/[id]/estilo`**: título "Como você quer o visual do seu site?", textarea até 500
  caracteres com contador ao vivo, 5 chips (Moderno, Elegante, Divertido, Minimalista, Rústico) que
  preenchem o texto, campo opcional de referência visual (usado só como texto — nunca `fetch`) e
  botão "Gerar meu site".
- **IA de estilo** (`lib/ia/estilo.ts`, seção 8.2): tool use com `tool_choice` forçado contra
  `estiloConfigSchema`; em `USE_MOCKS=true`, heurística por palavra-chave contra 5 configurações de
  estilo desenhadas à mão (uma por chip), com fallback por segmento quando nada bate.
- **Validador de contraste WCAG AA** (`lib/site/tema.ts`): calcula a razão de contraste (luminância
  relativa) entre texto/fundo e primária/fundo; quando abaixo de 4.5:1, escurece ou clareia a cor
  iterativamente até atingir a razão mínima, sem nunca inverter a direção original da cor (nunca
  transforma uma cor clara em escura ou vice-versa), com o preto/branco puro como último recurso
  quando o alvo é matematicamente inatingível contra o fundo.
- **IA de textos** (`lib/ia/textos.ts`, seção 8.3): título do hero, subtítulo, descrição de
  serviços, sobre e CTA no tom escolhido, usando só fatos do JSON da empresa. `titulo_pagina`/`h1`
  seguem `{nome} em {cidade}` quando a cidade é conhecida; sem cidade, cai só no nome da empresa —
  nunca uma palavra-chave genérica de localização (ver "Pendências" sobre `empresa.cidade`).
- **Guarda anti-alucinação** (`lib/ia/guardas.ts`, seção 8.4): `verificarConteudo` extrai todo
  telefone, valor monetário, horário e endereço que aparece nos textos gerados e confere contra os
  fatos permitidos da empresa; se algo não bater, `sanitizarConteudo` troca só o trecho violador
  (nunca descarta o conteúdo inteiro). O pipeline de geração regenera uma vez em caso de reprovação
  e sanitiza como último recurso.
- **Biblioteca de componentes** (`src/components/site/`): Hero, Serviços (com botão de WhatsApp por
  serviço), Prova social, Galeria, Sobre, Localização (endereço, horários e link para o mapa), FAQ
  (hoje sempre omitida — sem fonte de dados para perguntas frequentes ainda), Rodapé (com link para
  o perfil de origem). Cada componente se autoexclui quando falta o dado essencial que ele precisa —
  nunca um placeholder falso.
- **Tema por CSS variables** (`lib/site/tema.ts` + `tema.css`): `estiloParaVariaveisCss` traduz o
  `estilo_config` (já com o contraste corrigido) em variáveis CSS. As 8 famílias de fonte permitidas
  são pré-carregadas via `next/font/google` (`lib/site/fontes.ts`) — `tema.ts` referencia só os
  nomes das variáveis CSS resultantes (`var(--font-inter)` etc.), o que mantém o módulo puro e
  testável em Vitest sem depender do compilador do Next.
- **3 templates-base** (`servicos`, `comercio`, `alimentacao`, seed em migração): cada um define a
  ordem e as seções padrão do segmento; `resolverSecoes` faz a interseção entre as seções do
  template e as que o estilo pede — o pedido do usuário só pode remover seções do baseline do
  template, nunca adicionar uma que o template não define (ver `docs/decisoes.md`).
- **WhatsApp contextual** (`lib/site/whatsapp.ts`): `normalizarNumeroBrasileiro` aceita números com
  ou sem DDI/pontuação; `linkWhatsApp` monta o `wa.me/55...?text=...`; cada botão de serviço leva
  uma mensagem própria citando o serviço; `statusAtendimento` calcula se a empresa está aberta agora
  a partir dos horários e, fora do horário, o botão mostra "Respondemos a partir de {abertura}" sem
  deixar de permitir o envio.
- **Prévia responsiva** (`/empresa/[id]/previa`): alterna entre visualização de computador e celular
  dentro do próprio app, renderizando o site com o `SiteRenderer` real.
- **Limite de gerações**: `lib/config/planos.ts` define `LIMITE_GERACOES_POR_MES` (valor do plano
  Essencial, seção 1) como constante isolada — as tabelas `plano`/`assinatura` só chegam na Fase 7;
  `gerarNovaVersaoDoSite` conta gerações do mês via `evento_produto` antes de gerar.
- **Migração `20260920150000_fase3_estilo_e_sites.sql`**: `site.subdominio` passa a aceitar `null`
  (rascunhos ainda não têm subdomínio), `site_status_check` passa a aceitar `'suspenso'`,
  `versao_site` ganha `nota_qualidade` (usada só na Fase 6).

## Decisões

Ver a seção "Fase 3" em [`docs/decisoes.md`](../decisoes.md) — destaque para a interseção
template×estilo, o gap de `empresa.cidade`, e um bug de produção (não de lógica de negócio)
encontrado só ao testar o fluxo inteiro num navegador de verdade contra um Postgres real.

## Como rodar

```bash
npm install
cp .env.example .env.local   # com um projeto Supabase real para testar de verdade
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

Para testar com dados reais persistidos (não só com o cliente mockado dos testes), é preciso um
Supabase rodando — local via `supabase start` (ver `supabase/README.md`) ou um projeto real.

## Resultado dos checks (nesta máquina)

- `npm run lint` — sem erros.
- `npm run typecheck` — sem erros.
- `npm run test` — 21 arquivos, 198 testes, todos passando. Os 36 novos desta fase cobrem o
  validador de contraste (incluindo o caso matematicamente inatingível e a garantia de nunca
  inverter a direção da cor), a guarda anti-alucinação (telefone/endereço/preço inventados, com e
  sem violação) e o helper de WhatsApp (normalização de números, status de atendimento dentro e
  fora do horário).
- `npm run test:rls` — 9 testes contra o Postgres local, todos passando (nenhuma migração desta
  fase quebrou isolamento por RLS).
- `npm run build` — build de produção concluído com sucesso.
- **Verificado manualmente no navegador**, de ponta a ponta e com dados reais persistidos (Supabase
  local, ver seção "Testes de RLS" em `docs/decisoes.md`): cadastro → colar link → revisão →
  confirmação → estilo → geração → prévia, repetido para **3 negócios diferentes** (comércio,
  serviços, alimentação) com **3 pedidos de estilo diferentes** (elegante, rústico, divertido) —
  sites visivelmente diferentes em tipografia, paleta e tom de texto em todos os casos, contraste
  corrigido automaticamente, e nenhum dado inventado (seções sem dado essencial ficaram omitidas,
  ex.: Serviços na padaria, que não tem itens na fixture). Essa verificação ao vivo foi o que expôs
  e permitiu corrigir o bug de produção descrito em `docs/decisoes.md`.

## Pendências / próximos passos

- **`empresa.cidade` nunca é preenchida por nenhum conector** (Google, Instagram, manual) — o SEO
  degrada corretamente para "só o nome da empresa" sem cidade (nunca inventa uma), mas o padrão
  `{serviço} em {cidade}` do critério de aceite só é exercitado de verdade quando a cidade existir.
  Preencher isso exigiria estender o field mask do Google (`addressComponents`/`locality`), um campo
  novo no formulário manual e um novo caminho de sincronização — fora do escopo desta fase.
  Documentado em `docs/decisoes.md`.
- **FAQ sempre omitida**: nenhuma fonte de dados hoje produz perguntas frequentes; o componente
  existe e está registrado, mas nunca renderiza. Fica para quando houver uma fonte real para isso.
- **Sem chave real da Anthropic neste ambiente**: todo o texto acima (estilo, textos, guarda) foi
  validado com `USE_MOCKS=true`. O caminho real (tool use forçado, retry, custo/tokens) segue a
  mesma implementação já usada e testada em `ia/estruturador.ts`, mas não foi exercitado contra a
  API de verdade.
- Nenhuma credencial foi solicitada ou usada — tudo roda com `USE_MOCKS=true`.

---

**Fase 3 concluída — aguardando aprovação.**
