# Linka — Instruções para o Claude Code

> **Como usar:** crie uma pasta vazia, abra o terminal nela, rode `claude`, salve este arquivo como `CLAUDE.md` na raiz e escreva:
> **"Leia o CLAUDE.md e execute a Fase 0. Pare no final para eu revisar."**
> Depois de cada fase, revise e escreva: "Aprovado, execute a Fase N."
> Este arquivo substitui versões anteriores (inclusive `FASES_PRODUCAO.md`). **Não é um TCC:** é um produto real, com clientes pagantes.

---

## 1. Produto e negócio

**Linka** é uma plataforma web que gera e mantém a landing page de uma microempresa brasileira a partir de **um único link**: Instagram ou Google (Maps / perfil da empresa). É vendida por **assinatura mensal**.

**Fluxo do cliente**
1. Cola o link do Instagram ou do Google da empresa.
2. O sistema identifica a fonte, extrai os dados e mostra uma **tela de revisão** com o que foi identificado e a confiança de cada campo.
3. Abre uma **caixa de texto**: "Como você quer o visual do seu site?" (texto livre, até 500 caracteres, com sugestões clicáveis e referência opcional).
4. A IA converte o pedido em estilo, redige os textos só com fatos reais e o sistema monta o site por componentes.
5. O cliente vê a prévia com a **nota de qualidade**, ajusta (editando ou pedindo por texto) e **assina para publicar** em `nome-da-empresa.dominio.com.br`.
6. Acompanha visitas e cliques no WhatsApp e recebe relatório mensal (planos superiores).

**Proposta de valor:** o cliente não paga "por um site" (construtores baratos existem). Paga por **menos trabalho e mais contatos**: dados reais, qualidade verificada, WhatsApp como canal principal e um site que se mantém atualizado.

**Diferenciais que o produto deve entregar (e testar contra concorrentes)**
- Começa dos dados reais da empresa, não de um formulário genérico.
- **Portão de qualidade** com nota de 0 a 100 antes de publicar.
- **Verificador de consistência** entre Google, Instagram e site.
- SEO local (serviço + cidade), WhatsApp por serviço e aviso fora do horário.
- Manutenção: alertas de dados desatualizados e relatório mensal.

**Planos (valores iniciais são hipóteses, ficam em configuração e podem mudar sem alterar código)**

| Recurso | Essencial | Profissional | Premium |
| --- | --- | --- | --- |
| Preço inicial por mês | R$ 49 | R$ 89 | R$ 149 |
| Gerações de site por mês | 5 | 15 | 30 |
| Ajustes por texto por mês | 20 | 60 | 150 |
| Nota de qualidade, verificador, SEO local, WhatsApp por serviço | Sim | Sim | Sim |
| Catálogo com pedido no WhatsApp | — | Sim | Sim |
| Relatório mensal, alerta de dados desatualizados, kit de avaliações, promoções com validade | — | Sim | Sim |
| Assistente de IA no site (300 conversas/mês) | — | — | Sim |
| Versões em outros idiomas | — | — | Sim |
| Domínio próprio | — | — | Sim |

**Regra comercial:** gerar e ver a prévia é grátis; **publicar exige assinatura ativa**.

## 2. Regras inegociáveis

1. **Nada de scraping** de Instagram ou Google. Não use Puppeteer/Playwright nem leitura de HTML para ler perfis. Fontes permitidas: Google Places API (New), login oficial do dono via API da Meta (apenas interface e fallback no início) e entrada manual.
2. **Nunca inventar dados.** A IA jamais cria telefone, endereço, preço, horário ou avaliação ausente nos dados. Campo ausente = seção omitida ou pedido de preenchimento.
3. **Nunca commitar segredos.** Use `.env.local` (fora do git) e mantenha `.env.example` atualizado.
4. **Não peça chaves, senhas ou dados de cartão no chat.** Sem credencial, use mocks/fixtures, deixe a integração real atrás de variável de ambiente e me avise no relatório da fase.
5. **Nunca faça deploy em produção, rode migração destrutiva ou cobrança real sem minha confirmação explícita no chat.** Cobrança sempre no sandbox primeiro.
6. **Nunca armazene dados de cartão.** Use checkout/link de pagamento hospedado pelo provedor.
7. **Parar ao final de cada fase:** rodar `typecheck`, `lint` e `test`, escrever `docs/fases/faseN.md` e apresentar o relatório. Não avance sem minha aprovação.
8. Em dúvida real de escopo, pergunte. Em dúvida de detalhe, decida, registre em `docs/decisoes.md` e siga.
9. Idioma: **interface, mensagens e comentários em pt-BR**. Entidades de domínio seguem o modelo de dados da seção 6. Helpers genéricos podem ter nomes em inglês.
10. Commits pequenos e frequentes (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
11. Dados do Google: reviews e fotos ficam **desligados por padrão** até eu confirmar os termos vigentes da Places API. Não persista conteúdo de lugares além do que os termos permitem; guarde o `place_id`.

## 3. O que só o dono do projeto faz

O Claude Code não cria contas, não compra domínio e não recebe credenciais no chat. Em cada relatório de fase, **liste quais destas tarefas estão pendentes para mim**.

| # | Tarefa | Necessária antes de |
| --- | --- | --- |
| 1 | Projeto Supabase (staging gratuito e produção no plano Pro) | Fase 1 (staging) e Fase 8 (produção) |
| 2 | Google Cloud: faturamento, chave da Places API (New) restrita só a essa API, cotas por API e alerta de orçamento | Fase 2 |
| 3 | Chave da Anthropic e limite de gasto mensal no Console | Fase 3 |
| 4 | Conta no provedor de cobrança (Asaas por padrão) com verificação de CNPJ; começar no sandbox | Fase 7 |
| 5 | Contador: enquadramento, nota fiscal e impostos | Antes da primeira cobrança |
| 6 | Registrar o domínio no registro.br | Fase 8 |
| 7 | Vercel Pro (o plano gratuito é só para uso não comercial) | Fase 8 |
| 8 | E-mail transacional (ex.: Resend) com domínio verificado (SPF/DKIM) | Fase 8 |
| 9 | Revisão jurídica dos Termos de Uso e da Política de Privacidade | Fase 8 |

## 4. Stack

| Camada | Escolha |
| --- | --- |
| App e sites gerados | Next.js (App Router) + TypeScript (strict) + Tailwind CSS |
| Banco, auth e storage | Supabase (Postgres + Auth + Storage), migrações SQL em `supabase/migrations` |
| Validação | Zod em todas as fronteiras (entrada de API, saída da IA, dados externos, webhooks) |
| IA | SDK oficial da Anthropic (`@anthropic-ai/sdk`), saída estruturada via **tool use com `tool_choice` forçado** |
| Dados do Google | Places API (New) via REST, no servidor |
| Cobrança | Interface de provedor; Asaas como padrão |
| E-mail | Interface de provedor; Resend como padrão |
| Testes | Vitest (unitário e integração com mocks) e Playwright (E2E do fluxo principal) |
| Qualidade | ESLint, Prettier, `tsc --noEmit` |
| Hospedagem | Vercel (curinga de subdomínios) |

Sem fila de mensagens no início: extração e geração rodam em rotas de servidor com **status persistido no banco** e polling no cliente. Mantenha a lógica em funções puras para trocar por fila depois.

Variáveis de ambiente (`.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_PLACES_API_KEY=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-5
ANTHROPIC_MODEL_LEVE=claude-haiku-4-5-20251001
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
COBRANCA_PROVEDOR=asaas
ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=
EMAIL_PROVEDOR=resend
RESEND_API_KEY=
SENTRY_DSN=
USD_BRL=5.50
# Conteúdo do Google: manter false até conferir os termos vigentes da Places API
GOOGLE_SHOW_REVIEWS=false
GOOGLE_SHOW_PHOTOS=false
# Modo mock: usa fixtures em vez de chamar APIs externas
USE_MOCKS=true
```

## 5. Arquitetura

```
Cliente → API (Next.js) → Roteador de link
                          ├─ Conector Google (Places API)
                          ├─ Conector Instagram (interface + "não configurado" + fallback)
                          └─ Conector Manual (formulário curto)
                                   ↓
                     Normalizador + IA estruturadora (Zod)
                                   ↓
                            PostgreSQL (Supabase)
                                   ↓
       Verificador de consistência → Gerador (IA de estilo + IA de textos + templates)
                                   ↓
              Portão de qualidade → Renderizador (componentes) → subdomínio
                                   ↓
                     Cobrança (webhooks) · Métricas · Painel · Admin
```

Estrutura de pastas sugerida:

```
src/
  app/                    # rotas: institucional, painel, fluxo, admin, API
  app/_sites/[subdominio] # renderização dos sites publicados (via middleware)
  lib/
    conectores/           # google.ts, instagram.ts, manual.ts, tipos.ts, roteador.ts
    ia/                   # estruturador.ts, estilo.ts, textos.ts, ajuste.ts, guardas.ts, assistente.ts
    schemas/              # empresa.ts, estilo.ts (Zod)
    site/                 # componentes, templates, tema (CSS vars), jsonld, whatsapp, qualidade.ts
    consistencia/         # comparador entre fontes
    cobranca/             # provedor.ts, asaas.ts, planos.ts
    seguranca/            # ssrf.ts, ratelimit.ts, slug.ts
    metricas/             # eventos de produto e de uso, custos.ts
  components/
supabase/migrations/
scripts/                  # check-env.ts, backup.ts, smoke-prod.ts, relatorio-produto.ts
tests/ (unit, integration, fixtures, e2e)
docs/ (decisoes.md, arquitetura.md, dominio.md, operacao.md, fases/faseN.md)
```

## 6. Modelo de dados (Postgres)

Todas as tabelas têm `id uuid` e `criado_em timestamptz default now()`. **RLS ativado em todas**, com políticas por dono (`usuario_id = auth.uid()`). A leitura pública dos sites publicados acontece só no servidor (service role), nunca direto do cliente. Crie as tabelas de cada fase quando ela chegar.

| Tabela | Campos principais | Fase |
| --- | --- | --- |
| `usuario` (espelha `auth.users`) | nome, email, papel (`cliente`, `admin`), aceitou_lgpd_em | 1 |
| `empresa` | usuario_id, nome, segmento (`servicos`, `comercio`, `alimentacao`, `outro`), cidade, declaracao_titularidade_em | 1 |
| `fonte_dados` | empresa_id, tipo (`google`, `instagram`, `manual`), url, status (`pendente`, `ok`, `erro`, `nao_configurado`), bruto jsonb, coletado_em | 1 |
| `campo_extraido` | empresa_id, campo, valor jsonb, origem, confianca (`alta`, `media`, `baixa`), confirmado_pelo_usuario, editado_pelo_usuario | 2 |
| `template` | segmento, nome, componentes jsonb | 3 |
| `site` | empresa_id, subdominio (único, validado), status (`rascunho`, `publicado`, `suspenso`), publicado_em | 4 |
| `versao_site` | site_id, template_id, estilo_texto, estilo_config jsonb, conteudo jsonb, nota_qualidade, criado_em | 3 |
| `evento_metrica` | site_id, tipo (`visita`, `clique_whatsapp`), origem (ex.: serviço), data | 4 |
| `evento_produto` | empresa_id, tipo, payload jsonb, criado_em (funil, custo, uso) | 2 |
| `feedback` | site_id, nota_fidelidade_estilo (1–5), comentario | 5 |
| `plano` | codigo, nome, preco_centavos, limites jsonb, recursos jsonb | 7 |
| `assinatura` | empresa_id, plano_id, status (`teste`, `ativa`, `inadimplente`, `cancelada`), ids do provedor, proximo_vencimento | 7 |
| `evento_cobranca` | provedor_evento_id (único), tipo, payload jsonb, processado_em | 7 |
| `log_auditoria` | usuario_id, acao, alvo, detalhes jsonb | 7 |
| `denuncia` | site_id, motivo, contato, status | 8 |
| `item_catalogo`, `promocao`, `relatorio_mensal`, `conversa_assistente` | (definir na fase) | 9–10 |

## 7. Contratos de dados (Zod)

**Empresa normalizada** (saída dos conectores e do estruturador; ausente = `null`):

```json
{
  "empresa": {
    "nome": "string",
    "segmento": "servicos | comercio | alimentacao | outro",
    "descricao_curta": "string | null",
    "servicos": [{ "nome": "string", "descricao": "string | null" }],
    "contato": { "whatsapp": "string | null", "telefone": "string | null", "email": "string | null", "instagram": "string | null", "site": "string | null" },
    "endereco": { "texto": "string | null", "lat": "number | null", "lng": "number | null" },
    "horarios": [{ "dia": "seg|ter|qua|qui|sex|sab|dom", "abre": "HH:MM", "fecha": "HH:MM" }],
    "midia": { "logo": "url | null", "fotos": ["url"] },
    "prova_social": { "nota": "number | null", "total_avaliacoes": "number | null", "avaliacoes": [{ "autor": "string", "texto": "string", "origem": "string" }] }
  },
  "origem_e_confianca": { "<caminho.do.campo>": { "fonte": "google|instagram|manual", "confianca": "alta|media|baixa" } }
}
```

**Estilo** (valores só de listas permitidas; qualquer valor fora da lista é rejeitado):

```json
{
  "tema": "claro | escuro",
  "paleta": { "primaria": "#RRGGBB", "secundaria": "#RRGGBB", "fundo": "#RRGGBB", "texto": "#RRGGBB" },
  "tipografia": { "titulos": "Inter|Poppins|Montserrat|DM Sans|Playfair Display|Lora|Merriweather|Nunito", "corpo": "Inter|DM Sans|Nunito|Lora" },
  "tom_de_voz": "formal | descontraido | acolhedor | tecnico | premium",
  "densidade": "compacta | media | espacada",
  "raio_borda": "nenhum | pequeno | medio | grande",
  "secoes": ["hero","servicos","prova_social","galeria","sobre","localizacao","contato","faq"],
  "destaque_cta": "whatsapp | telefone | mapa"
}
```

## 8. Comportamento da IA

Todas as chamadas: tool use com esquema, `tool_choice` forçado, validação Zod, **uma nova tentativa** se inválido, erro tratado com mensagem amigável se falhar de novo. Em `USE_MOCKS=true`, devolver fixtures determinísticas. **Toda chamada registra tokens de entrada/saída, modelo e custo estimado em R$** (config `metricas/custos.ts`, usando `USD_BRL`) em `evento_produto`.

- **8.1 Estruturador** (`ia/estruturador.ts`): entrada = dados brutos das fontes. Use somente informações presentes; ausente = `null`; nunca invente telefone, endereço, preço, horário ou avaliação; devolva fonte e confiança por campo; classifique o segmento.
- **8.2 Estilo** (`ia/estilo.ts`): entrada = texto livre, segmento, referência opcional (**só como texto; nunca faça fetch da URL de referência**). Saída = objeto de estilo. O servidor valida **contraste WCAG AA** e corrige automaticamente.
- **8.3 Textos** (`ia/textos.ts`): título do hero, subtítulo, serviços, sobre e chamadas no tom escolhido, **usando só fatos do JSON**, com serviço + cidade nos títulos.
- **8.4 Guarda anti-alucinação** (`ia/guardas.ts`): todo telefone, endereço, horário e valor monetário nos textos deve existir nos dados de entrada; senão, remover o trecho ou regenerar uma vez. Testes obrigatórios.
- **8.5 Ajuste por texto** (`ia/ajuste.ts`): entrada = versão atual + pedido curto. Saída = novo estilo e/ou textos, validados pelos mesmos esquemas. Cada ajuste cria nova `versao_site` (permite desfazer).
- **8.6 Custos:** modelo padrão `ANTHROPIC_MODEL`; tarefas simples (assistente, relatório) usam `ANTHROPIC_MODEL_LEVE`. **Limite duro por conta e por dia** (gerações e ajustes) definido pelo plano, para nenhum cliente gerar custo descontrolado.

## 9. Fases

Cada fase termina com: código + migrações + testes + `docs/fases/faseN.md` (o que foi feito, decisões, como rodar, pendências para o dono) e a mensagem "Fase N concluída — aguardando aprovação".

### Fase 0 — Fundação
- Projeto Next.js + TypeScript strict + Tailwind, ESLint/Prettier, Vitest, scripts `dev`, `build`, `lint`, `typecheck`, `test`.
- `.env.example`, `.gitignore`, `README.md` (como rodar e configurar Supabase, Google e Anthropic), `docs/decisoes.md`.
- Pasta `supabase/` com primeira migração vazia e instruções para aplicar.
- **Aceite:** `npm run dev` sobe; `lint`, `typecheck` e `test` passam.

### Fase 1 — Banco, login e entrada do link
- Migrações das tabelas da Fase 1 com RLS e políticas, e **testes de RLS** (usuário A não vê dados do B).
- Login/cadastro (Supabase Auth) com aceite de LGPD e páginas `/privacidade` e `/termos` (rascunho).
- Tela **/novo** com campo único "Cole o link do Instagram ou do Google da sua empresa" e opção "Não tenho link, quero preencher manualmente".
- `conectores/roteador.ts`: detecta o tipo pela URL (instagram.com; google.com/maps; maps.app.goo.gl; g.page; share.google e similares). URL inválida ou de outro domínio = erro amigável.
- `seguranca/ssrf.ts`: requisições a partir de URL do usuário só a hosts permitidos, com timeout, limite de redirecionamentos e bloqueio de IPs privados.
- **Aceite:** testes do roteador com pelo menos 15 URLs (válidas, curtas, inválidas, maliciosas); usuário cria conta, entra e cria uma `empresa` com uma `fonte_dados` pendente.

### Fase 2 — Extração, normalização e revisão
- Conector Google: resolver o link (inclusive curto) até `place_id` ou consulta de texto; preferir busca **só por IDs** (sem custo) seguida de **um** Place Details com o `X-Goog-FieldMask` mínimo (id, nome, endereço, telefones, site, horários, categoria, nota, total de avaliações, localização). Reviews e fotos só com `GOOGLE_SHOW_REVIEWS`/`GOOGLE_SHOW_PHOTOS`. Confirme endpoints e campos na documentação vigente.
- Conector Instagram: interface pronta, `status = nao_configurado` e ativação do **fallback** (colar bio, informar telefone/WhatsApp, enviar fotos para o Storage com validação de tipo e tamanho).
- Conector Manual: formulário curto (nome, ramo, descrição, contatos, endereço, horários, serviços, fotos).
- Normalizador + estruturador (8.1) gravando `campo_extraido`. Conflito: Google prevalece em endereço, telefone e horários; Instagram/manual em bio, tom e fotos.
- **Verificador de consistência** (`lib/consistencia`): compara telefone, endereço, horário e nome entre as fontes e mostra divergências na revisão ("O horário do Google e o da sua bio não batem. Qual está certo?").
- Tela **/empresa/[id]/revisao**: campos com selo de confiança (alta/média/baixa), edição inline, "Confirmar dados". Baixa confiança e divergências destacadas.
- Checkbox obrigatório de **declaração de titularidade** ("Sou dono ou responsável por este negócio").
- Eventos em `evento_produto`: `link_colado`, `extracao_concluida`, `campo_editado`, `revisao_confirmada`.
- **Aceite:** com `USE_MOCKS=true`, fluxo link → revisão ponta a ponta com fixtures de 3 negócios diferentes; testes de integração com respostas gravadas da Places API; testes do verificador (com e sem divergência).

### Fase 3 — Caixa de estilo, geração e prévia
- Tela **/empresa/[id]/estilo**: título "Como você quer o visual do seu site?", textarea até 500 caracteres com contador, chips (Moderno, Elegante, Divertido, Minimalista, Rústico), referência opcional, botão "Gerar meu site".
- Implementar 8.2, 8.3, 8.4 e o validador de contraste, respeitando o limite de gerações do plano (config, ainda com valores de teste).
- Componentes: Hero, Serviços, Prova social, Galeria, Sobre, Localização (endereço, horários e link para mapa), Contato, FAQ (opcional), Rodapé (com link para o perfil de origem). Tema por **CSS variables**; fontes via `next/font`.
- 3 templates-base (`servicos`, `comercio`, `alimentacao`) definindo ordem e seções; o estilo do usuário ajusta o template.
- **WhatsApp contextual:** botão por serviço com mensagem própria (`wa.me/55...?text=...`, helper com testes de normalização de números brasileiros); **fora do horário**, mostrar "Respondemos a partir de {abertura}" e ainda permitir enviar.
- **SEO local:** título, descrição e H1 no padrão `{serviço} em {cidade}`; nunca palavra-chave genérica sem cidade.
- Prévia responsiva (celular/desktop). Dado essencial ausente = seção omitida, nunca placeholder falso.
- **Aceite:** para 3 fixtures e 3 pedidos de estilo diferentes, sites visivelmente diferentes; contraste AA; guarda anti-alucinação com testes (telefone, endereço e preço inventados).

### Fase 4 — Publicação, rastreamento e painel
- Middleware de subdomínio: `nome.NEXT_PUBLIC_ROOT_DOMAIN` renderiza o site publicado (em dev, `nome.localhost:3000`). Slug só `a-z0-9-`, 3 a 40 caracteres, com lista de reservados (`www`, `app`, `api`, `admin`, `painel`, `login`, `mail`, `status`, `suporte`) e checagem de unicidade.
- Publicar/despublicar (por enquanto sem exigir assinatura, que vem na Fase 7). Só publica com declaração de titularidade.
- SEO técnico: `title`, `description`, Open Graph, `sitemap`/`robots` por site e **JSON-LD `LocalBusiness`**.
- Botão flutuante de WhatsApp, imagens otimizadas e com carregamento preguiçoso.
- Rastreamento sem dados pessoais: `/api/track` grava `visita` e `clique_whatsapp` (com o serviço de origem) em `evento_metrica`, sem IP e com limite de taxa.
- Painel **/painel**: sites, status, visitas e cliques (7 e 30 dias), por serviço.
- **Aceite:** publicar em `*.localhost:3000`, abrir o site, clicar no WhatsApp e ver as contagens; Lighthouse mobile com desempenho, acessibilidade e SEO altos (números no relatório).

### Fase 5 — Ajustes por texto e robustez
- Editor: prévia + edição direta de textos e imagens + caixa "Peça um ajuste" (8.5), histórico de versões com "desfazer".
- Limite de taxa por usuário nas rotas de IA e extração; erros com mensagens úteis; estados de carregamento e vazio.
- Widget "O site ficou como você pediu?" (nota 1–5) gravando em `feedback`.
- Teste E2E (Playwright) do fluxo em modo mock: cadastro → link → revisão → estilo → gerar → publicar.
- `docs/arquitetura.md` com diagramas em Mermaid.
- **Aceite:** E2E passa; `npm run build` passa; checklist de segurança da seção 11 conferido no relatório.

### Fase 6 — Portão de qualidade e nota de presença
Objetivo: fechar o plano **Essencial** com os diferenciais de qualidade.

**6.1 Nota de qualidade (0 a 100)** — `lib/site/qualidade.ts`, calculada a cada geração e edição, com lista do que falta. Pesos ajustáveis em um único arquivo de configuração:

| Critério | Peso | Falha crítica? |
| --- | --- | --- |
| Pelo menos um contato válido (WhatsApp ou telefone) | 20 | **Sim**, bloqueia publicação |
| WhatsApp em formato válido, com link `wa.me` gerado | 10 | Sim |
| Nome e descrição presentes | 10 | Sim |
| Endereço e horários (negócio com local físico) | 10 | Não |
| Fotos reais suficientes (mínimo 3) e sem baixa resolução | 15 | Não |
| Contraste WCAG AA em todos os pares de cor | 10 | Sim |
| Título e descrição com serviço + cidade | 10 | Não |
| JSON-LD `LocalBusiness` válido | 5 | Não |
| Desempenho mobile medido por Lighthouse em CI acima do mínimo | 10 | Não |

Falha crítica impede publicar e explica como corrigir. Nota abaixo de 70 mostra aviso, mas permite publicar.

**6.2 Nota de presença (isca de vendas)** — rota `/nota`: o visitante cola o link, o sistema avalia a presença (campos faltando, fotos, horários, contato) e mostra nota + prévia do site. **Exige login ou captcha, limite de 3 por dia por conta/IP e cache**, porque cada uso chama a Places API (custa dinheiro).

**Aceite:** testes unitários da nota; publicação bloqueada nos casos críticos e liberada após correção (E2E); nota visível no editor.

### Fase 7 — Planos, cobrança e painel administrativo
Objetivo: cobrar mensalidade de forma segura e automática.

- Tabelas `plano`, `assinatura`, `evento_cobranca`, `log_auditoria` (com RLS). Preços, limites e recursos por plano ficam em **configuração**, nunca fixos no código (valores iniciais na tabela da seção 1).
- Provedor de pagamento por interface (`cobranca/provedor.ts`), Asaas como implementação padrão, **sandbox** em desenvolvimento e mock em `USE_MOCKS=true`.
- Pix e cartão via **checkout/link hospedado pelo provedor**. Nunca armazenar dados de cartão.
- Webhook `/api/webhooks/cobranca`: validar token/assinatura, tratar de forma **idempotente** (mesmo evento duas vezes = mesmo resultado), registrar em `evento_cobranca`.
- Regras: gerar e pré-visualizar é grátis; **publicar exige assinatura ativa**; limites de gerações/ajustes por plano aplicados de fato.
- Inadimplência: 7 dias de carência com aviso por e-mail; depois o site sai do ar com página "temporariamente indisponível". **Nunca apagar dados** por inadimplência. Regularizou = reativa sozinho.
- Cancelamento autoatendido no painel, com efeito ao fim do período pago. Plano anual (10 meses pagos, 12 de uso) atrás de flag.
- **Painel admin `/admin`** (papel `admin`, protegido no servidor): lista de clientes, empresas, sites e assinaturas; ações de suspender/reativar site; funil de ativação; custo médio por site gerado; log de auditoria de toda ação administrativa.
- Eventos em `evento_produto`: `assinatura_iniciada`, `pagamento_falhou`, `assinatura_cancelada`, `site_publicado`.
- **Aceite:** fluxo em sandbox (assinar → publicar → falhar pagamento → carência → suspender → regularizar → reativar); teste do webhook duplicado; publicação só com assinatura ativa; nenhum dado de cartão no banco ou nos logs; `/admin` inacessível para não-admin (teste).

### Fase 8 — Produção: hospedagem, banco, domínio e URLs
Objetivo: o produto no ar, seguro, monitorado e recuperável, pronto para vender.

**8.1 Ambientes**

| Ambiente | Vercel | Supabase | Uso |
| --- | --- | --- | --- |
| Local | `npm run dev` | local ou staging | Desenvolvimento |
| Staging | Deploys de preview | Projeto gratuito separado | Testes antes de produção |
| Produção | Branch `main` | Projeto Pro | Clientes reais |

Variáveis **separadas por ambiente** (chaves diferentes de Google, Anthropic e cobrança). `scripts/check-env.ts` faz o build falhar se faltar variável de produção.

**8.2 URLs e domínio** (substituir `dominio.com.br` pelo domínio real)

| Endereço | Função |
| --- | --- |
| `dominio.com.br` e `www.` | Página de vendas (planos, como funciona, FAQ) com a nota de presença |
| `app.dominio.com.br` | Painel do cliente (login, editor, cobrança) e `/admin` |
| `nome-da-empresa.dominio.com.br` | Site publicado de cada cliente (curinga `*.dominio.com.br`) |

Configuração (o Claude Code entrega o passo a passo em `docs/dominio.md`; os passos de DNS são do dono):
1. No registro.br, apontar o domínio para os servidores DNS da Vercel (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`), necessário para o curinga.
2. No projeto Vercel, adicionar o domínio principal e o curinga `*.dominio.com.br`; a Vercel emite HTTPS para cada subdomínio.

No código: middleware por **host** (`app.` → painel; subdomínio de cliente → site; raiz → vendas); lista de subdomínios reservados; **cookies de sessão restritos ao host `app.`** (nunca em `.dominio.com.br`); redirecionamento `http`→`https` e `www`→principal; `robots.txt` e `sitemap.xml` por site com URL canônica correta.

**8.3 Página de vendas:** hero com a proposta, "como funciona" em 3 passos, exemplos de sites gerados, planos lidos da configuração, FAQ, botão "Gerar meu site grátis", nota de presença e contato por WhatsApp.

**8.4 Banco em produção**
- Migrações versionadas aplicadas por CLI (`supabase link` + `supabase db push`); nunca editar produção "no painel".
- RLS verificado com testes automatizados.
- Buckets: `uploads-pendentes` (privado) e `midia-publicada` (público, só arquivos aprovados), com limites de tamanho e tipo.
- Auth: URL do site e redirecionamentos de produção; **SMTP próprio** para e-mails de confirmação (o e-mail padrão do Supabase é limitado; confira a documentação vigente).
- Índices em `site.subdominio` (único), `empresa.usuario_id` e `evento_metrica(site_id, data)`.
- Backups: usar os diários do plano Pro **e** um script semanal (`scripts/backup.ts`) que exporta para armazenamento separado. Documentar e **testar a restauração** ao menos uma vez.

**8.5 Segurança e custo:** cabeçalhos (CSP, HSTS, X-Content-Type-Options, Referrer-Policy); limite de taxa nas rotas públicas e de IA; chaves restritas (Google só para Places); segredos só no servidor; **limites de gasto** (cota diária por API no Google, limite mensal no Console da Anthropic, alerta de gasto na Vercel); `/termos`, `/privacidade`, aviso de cookies e função "excluir minha conta e dados".

**8.6 Operação e abuso**
- Monitoramento de erros (ex.: Sentry) sem dados pessoais; verificação externa de disponibilidade de `app.` e de um site de teste, com alerta por e-mail; página de status simples.
- **Denúncia de site:** link "Denunciar este site" no rodapé de cada site publicado, criando registro em `denuncia`, visível no `/admin`, com ação de suspender.
- `docs/operacao.md`: deploy, **rollback**, restaurar backup, rotacionar chaves, o que fazer se Places ou IA falharem, como suspender um site.
- Canal de suporte (e-mail e WhatsApp) visível no painel.

**8.7 Teste de fumaça pós-deploy** (`scripts/smoke-prod.ts`): página inicial abre com HTTPS; login funciona; site de teste em `*.dominio.com.br` responde 200 com certificado válido; clique de WhatsApp grava evento; webhook de cobrança de teste é aceito.

**Checklist de entrada em produção** (Claude Code preenche, eu confirmo):
- [ ] Domínio na Vercel com curinga e HTTPS válido
- [ ] Migrações aplicadas em produção e RLS testado
- [ ] `check-env` passando com as variáveis de produção
- [ ] Backups ativos e restauração testada
- [ ] Limites de gasto configurados (Google, Anthropic, Vercel)
- [ ] Cobrança testada em sandbox e depois com uma cobrança real de valor baixo
- [ ] Termos, privacidade, cookies e exclusão de dados publicados
- [ ] Monitoramento, alerta de disponibilidade e canal de denúncia ativos
- [ ] Página de vendas no ar
- [ ] Smoke test de produção passando

**Aceite:** `docs/operacao.md` e `docs/dominio.md` escritos; smoke test verde em produção; checklist completo; um site real de teste publicado em subdomínio próprio com HTTPS e cobrança funcionando.

### Fase 9 — Plano Profissional (depois de ter clientes pagando)
Todos os recursos atrás do controle de plano da Fase 7:
1. **Catálogo com pedido no WhatsApp:** itens com nome, descrição, preço opcional e foto; carrinho simples que monta a mensagem ("Quero 2 x X e 1 x Y") e abre o WhatsApp. Sem pagamento online.
2. **Relatório mensal por e-mail:** visitas, cliques no WhatsApp, serviço mais procurado e nota de qualidade; texto gerado por IA leve com base **só nos números reais**.
3. **Alerta de dados desatualizados:** verificação mensal (dentro das regras da Places API, sem guardar dados além do permitido) comparando horário, telefone e endereço; aviso ao dono com botão "atualizar site".
4. **Kit de avaliações:** link direto para avaliar no Google, QR code e cartaz em PDF para imprimir.
5. **Promoções com validade:** banner com início e fim, que sai do ar sozinho.
- **Aceite:** cada recurso liberado só para os planos corretos; testes de plano e de expiração de promoção; relatório enviado em staging.

### Fase 10 — Plano Premium
1. **Assistente de IA no site:** responde só com dados do negócio; sem resposta, encaminha ao WhatsApp. Modelo leve, limite de 300 conversas por mês, proteção contra abuso, aviso de que é automático.
2. **Idiomas:** inglês e espanhol gerados dos dados, com revisão do dono antes de publicar.
3. **Domínio próprio do cliente:** adicionar e verificar o domínio pelo SDK da Vercel (registro TXT), HTTPS automático, redirecionamento do subdomínio e limpeza quando o cliente sair.
4. **Plano para agências e freelancers:** painel para gerenciar vários negócios, com cobrança por quantidade.
- **Aceite:** limites do assistente respeitados nos testes; domínio próprio verificado em um caso real; guarda anti-alucinação do assistente coberta por testes.

## 10. Métricas de produto

Registrar em `evento_produto` (com `empresa_id` e timestamp) e entregar `npm run relatorio:produto`, que imprime e exporta em CSV:

| Métrica | Como medir |
| --- | --- |
| Ativação | % de `link_colado` que chegam a `site_publicado`, e o tempo entre os dois |
| Esforço de correção | Média de `campo_editado` por empresa |
| Custo por site | Soma do custo estimado de IA e Places por `site_gerado` e por ajuste |
| Conversão | Empresas com prévia → assinatura ativa |
| Cancelamento | `assinatura_cancelada` / assinaturas ativas no mês |
| Valor entregue | Cliques no WhatsApp por site por mês |
| Satisfação | Média de `nota_fidelidade` |

**Referência de custos (estimativas para dimensionar limites; medir e ajustar):** criação de um site custa poucos reais (IA + Places), cerca de R$ 1,50 no primeiro mês com ajustes, e menos de R$ 0,50 por mês depois; os custos fixos de infraestrutura ficam perto de R$ 300 por mês.

## 11. Checklist de segurança e privacidade

- Todas as rotas de API exigem autenticação, exceto `/api/track`, a renderização pública, `/nota` (com captcha e limite) e os webhooks (validados por token).
- RLS ativo e testado; `/admin` protegido no servidor.
- SSRF bloqueado (hosts permitidos, sem IPs privados, timeout, limite de redirecionamentos).
- Uploads: tipo, tamanho e quantidade limitados; nomes gerados pelo servidor.
- Saída da IA sempre validada por Zod; nunca `dangerouslySetInnerHTML` com conteúdo gerado ou extraído.
- Slugs validados; reservados bloqueados; site só publica com titularidade declarada.
- Logs sem chaves, sem dados de cartão e sem dados pessoais desnecessários.
- Política de privacidade, termos e exclusão de dados disponíveis; aviso de que os textos foram gerados por IA e devem ser revisados antes de publicar.

## 12. Fora do escopo até haver demanda

Loja virtual com pagamento online, blog, múltiplas páginas, integração real com a API do Instagram (depende de aprovação da Meta; hoje interface + fallback), edição do site por mensagem de WhatsApp (depende da API oficial e de custo), agendamento online, edição colaborativa.

## 13. Definição de "pronto para vender"

- Fases 0 a 8 concluídas, com relatórios em `docs/fases/`.
- Um cliente real consegue: colar o link → revisar dados → escrever o estilo → ver a prévia com a nota de qualidade → assinar → publicar em `nome.dominio.com.br` com HTTPS → ver visitas e cliques no painel.
- Cobrança testada, sistema monitorado, backup restaurável, limites de gasto ativos, páginas legais publicadas, `/admin` funcionando.
- Nenhum segredo no repositório; `lint`, `typecheck`, `test`, E2E e `build` passando.

---

**Comece agora pela Fase 0.** Antes de escrever código, leia este arquivo inteiro, liste em até 10 linhas o plano da Fase 0 e as suposições que fizer, aponte quais tarefas da seção 3 dependem de mim e então execute.
