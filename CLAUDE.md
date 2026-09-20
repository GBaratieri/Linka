# SiteLink — Instruções para o Claude Code

> **Como usar:** crie uma pasta vazia, abra o terminal nela, rode `claude`, salve este arquivo como `CLAUDE.md` na raiz e escreva:
> **"Leia o CLAUDE.md e execute a Fase 0. Pare no final para eu revisar."**
> Depois de cada fase, revise e escreva: "Aprovado, execute a Fase N."

---

## 1. Missão

Construir o **Linka**, uma plataforma web (MVP de TCC) que gera uma landing page para uma microempresa brasileira a partir de **um único link**: Instagram ou Google (Maps / perfil da empresa).

Fluxo do usuário:

1. Cola o link do Instagram ou do Google da empresa.
2. O sistema identifica a fonte, extrai os dados da empresa e mostra uma **tela de revisão** com o que foi identificado e um nível de confiança por campo.
3. Abre uma **caixa de texto**: "Como você quer o visual do seu site?" (texto livre, até 500 caracteres, com sugestões clicáveis e campo opcional de referência).
4. A IA converte o pedido em configuração de estilo, redige os textos com os dados reais e o sistema renderiza o site por componentes.
5. O usuário vê a prévia, ajusta (editando direto ou pedindo por texto, ex.: "deixe mais sério") e publica em um subdomínio.
6. Um painel mostra visitas e cliques no WhatsApp.

O projeto também é objeto de pesquisa (TCC): o sistema precisa **registrar métricas de validação** (ver seção 9).

## 2. Regras inegociáveis

1. **Nada de scraping** de Instagram ou Google. Não use Puppeteer/Playwright/fetch de HTML para ler perfis. Fontes permitidas: Google Places API (New), login oficial do dono via API da Meta (apenas interface + stub no MVP) e entrada manual.
2. **Nunca inventar dados.** A IA jamais cria telefone, endereço, preço, horário ou avaliação que não esteja nos dados de entrada. Campo ausente = seção omitida ou pedido de preenchimento.
3. **Nunca commitar segredos.** Use `.env.local` (ignorado pelo git) e mantenha `.env.example` atualizado.
4. **Não peça chaves de API a mim no chat.** Se faltar credencial, use mocks/fixtures, deixe a integração real atrás de variável de ambiente e me avise no relatório da fase.
5. **Parar ao final de cada fase**, rodar `typecheck`, `lint` e `test`, e só então apresentar o relatório. Não avance para a fase seguinte sem eu aprovar.
6. Em dúvida real de escopo, pergunte antes de implementar. Em dúvida de detalhe, decida, registre em `docs/decisoes.md` e siga.
7. Idioma: **interface, mensagens e comentários em português (pt-BR)**. Nomes de entidades de domínio seguem o modelo de dados da seção 5. Código genérico (helpers, hooks) pode ter nomes em inglês.
8. Commits pequenos e frequentes, mensagens no formato `feat:`, `fix:`, `chore:`, `docs:`, `test:`.

## 3. Stack

| Camada | Escolha |
| --- | --- |
| App e sites gerados | Next.js (App Router) + TypeScript (strict) + Tailwind CSS |
| Banco, auth e storage | Supabase (Postgres + Auth + Storage), migrações SQL em `supabase/migrations` |
| Validação | Zod em todas as fronteiras (entrada de API, saída da IA, dados externos) |
| IA | SDK oficial da Anthropic (`@anthropic-ai/sdk`), saída estruturada via **tool use com `tool_choice` forçado**; modelo em `ANTHROPIC_MODEL` (nunca fixo no código) |
| Dados do Google | Places API (New) via REST no servidor |
| Testes | Vitest (unitários e integração com mocks) e, na Fase 5, um teste E2E com Playwright |
| Qualidade | ESLint, Prettier, `tsc --noEmit` |
| Hospedagem alvo | Vercel (subdomínios via wildcard) |

Sem fila de mensagens no MVP: extração e geração rodam em rotas de servidor com **status persistido no banco** e polling no cliente. Deixe a lógica em funções puras para trocar por fila depois.

Variáveis de ambiente (`.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_PLACES_API_KEY=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-5
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
# Conteúdo do Google: manter false até conferir os termos vigentes da Places API
GOOGLE_SHOW_REVIEWS=false
GOOGLE_SHOW_PHOTOS=false
# Modo mock: usa fixtures em vez de chamar APIs externas
USE_MOCKS=true
```

## 4. Arquitetura

```
Usuário → API (Next.js) → Roteador de link
                          ├─ Conector Google (Places API)
                          ├─ Conector Instagram (interface + stub "não configurado")
                          └─ Conector Manual (formulário curto)
                                   ↓
                     Normalizador + IA estruturadora (Zod)
                                   ↓
                            PostgreSQL (Supabase)
                                   ↓
              Gerador de site (IA de estilo + IA de textos + templates)
                                   ↓
                 Renderizador (componentes) → subdomínio
```

Estrutura de pastas sugerida:

```
src/
  app/                    # rotas (painel, telas do fluxo, API)
  app/_sites/[subdominio] # renderização dos sites publicados (via middleware)
  lib/
    conectores/           # google.ts, instagram.ts, manual.ts, tipos.ts, roteador.ts
    ia/                   # estruturador.ts, estilo.ts, textos.ts, ajuste.ts, guardas.ts
    schemas/              # empresa.ts, estilo.ts (Zod)
    site/                 # componentes, templates, tema (CSS vars), jsonld, whatsapp
    seguranca/            # ssrf.ts, ratelimit.ts, slug.ts
    metricas/             # eventos de pesquisa e de uso
  components/
supabase/migrations/
tests/ (unit, integration, fixtures, e2e)
docs/ (decisoes.md, fases/faseN.md)
```

## 5. Modelo de dados (Postgres)

Todas as tabelas com `id uuid`, `criado_em timestamptz default now()`. **RLS ativado em todas**; políticas por dono (`usuario_id = auth.uid()`). A leitura pública dos sites publicados acontece só no servidor (service role), nunca direto do cliente.

| Tabela | Campos principais |
| --- | --- |
| `usuario` (espelha `auth.users`) | id, nome, email, aceitou_lgpd_em |
| `empresa` | usuario_id, nome, segmento (`servicos`, `comercio`, `alimentacao`, `outro`), cidade, declaracao_titularidade_em |
| `fonte_dados` | empresa_id, tipo (`google`, `instagram`, `manual`), url, status (`pendente`, `ok`, `erro`, `nao_configurado`), bruto jsonb, coletado_em |
| `campo_extraido` | empresa_id, campo, valor jsonb, origem, confianca (`alta`, `media`, `baixa`), confirmado_pelo_usuario bool, editado_pelo_usuario bool |
| `template` | segmento, nome, componentes jsonb (lista ordenada) |
| `site` | empresa_id, subdominio (único, validado), status (`rascunho`, `publicado`), publicado_em |
| `versao_site` | site_id, template_id, estilo_texto, estilo_config jsonb, conteudo jsonb, criado_em |
| `evento_metrica` | site_id, tipo (`visita`, `clique_whatsapp`), data, origem |
| `evento_pesquisa` | empresa_id, tipo, payload jsonb, criado_em (métricas do TCC, seção 9) |
| `feedback` | site_id, nota_fidelidade_estilo (1–5), sus jsonb (opcional), comentario |

## 6. Contratos de dados (Zod)

**Empresa normalizada** (saída da IA estruturadora e dos conectores, campos ausentes = `null`):

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

**Estilo** (saída da IA de estilo; todos os valores dentro de listas permitidas — qualquer valor fora da lista é rejeitado pelo Zod):

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

## 7. Comportamento da IA

Todas as chamadas: tool use com esquema, `tool_choice` forçado, validação Zod, **uma nova tentativa** se inválido, e erro tratado com mensagem amigável se falhar de novo. Em `USE_MOCKS=true`, devolver fixtures determinísticas.

**7.1 Estruturador** (`ia/estruturador.ts`). Entrada: dados brutos das fontes. Instruções do sistema, em resumo: use somente informações presentes nos dados; ausente = `null`; nunca invente telefone, endereço, preço, horário ou avaliação; devolva fonte e confiança por campo; classifique o segmento.

**7.2 Estilo** (`ia/estilo.ts`). Entrada: texto livre do usuário, segmento, referência opcional (**apenas como texto; nunca faça fetch da URL de referência**). Saída: objeto de estilo. Depois, o servidor **valida contraste WCAG AA** entre texto/fundo e primária/fundo e corrige automaticamente (escurecer/clarear) quando necessário.

**7.3 Textos** (`ia/textos.ts`). Redige título do hero, subtítulo, descrição de serviços, sobre e chamadas para ação no tom escolhido, **usando só fatos do JSON da empresa**. Saída em JSON por seção.

**7.4 Guarda anti-alucinação** (`ia/guardas.ts`). Após gerar os textos, verificar que todo número de telefone, endereço, horário e valor monetário que aparece nos textos existe nos dados de entrada. Se algo não bater, remover o trecho ou regenerar uma vez. Testes unitários obrigatórios.

**7.5 Ajuste por texto** (`ia/ajuste.ts`). Entrada: versão atual + pedido curto ("deixe mais sério", "troque a cor para verde"). Saída: novo `estilo_config` e/ou textos alterados, validados pelos mesmos esquemas. Cada ajuste cria uma nova `versao_site` (permite desfazer).

## 8. Fases

Cada fase termina com: código + migrações + testes + `docs/fases/faseN.md` (o que foi feito, decisões, como rodar, pendências) e a mensagem "Fase N concluída — aguardando aprovação".

### Fase 0 — Fundação
- Criar o projeto Next.js + TypeScript strict + Tailwind, ESLint/Prettier, Vitest, scripts `dev`, `build`, `lint`, `typecheck`, `test`.
- `.env.example`, `.gitignore`, `README.md` (como rodar e como configurar Supabase/Google/Anthropic), `docs/decisoes.md`.
- Pasta `supabase/` com a primeira migração vazia e instruções para aplicar.
- **Aceite:** `npm run dev` sobe; `lint`, `typecheck` e `test` passam.

### Fase 1 — Banco, login e entrada do link
- Migrações de todas as tabelas da seção 5, com RLS e políticas.
- Login/cadastro (Supabase Auth) com aceite de LGPD (texto simples + link para política de privacidade em `/privacidade`).
- Tela **/novo** com campo único "Cole o link do Instagram ou do Google da sua empresa" e opção "Não tenho link, quero preencher manualmente".
- `lib/conectores/roteador.ts`: detecta o tipo pela URL (instagram.com; google.com/maps; maps.app.goo.gl; g.page; share.google e similares). URL inválida ou de outro domínio = erro amigável.
- `seguranca/ssrf.ts`: qualquer requisição a partir de URL do usuário só pode ir a hosts da lista de permissão, com timeout, limite de redirecionamentos e bloqueio de IPs privados.
- **Aceite:** testes do roteador cobrindo pelo menos 15 URLs (válidas, curtas, inválidas, maliciosas); usuário cria conta, entra e cria uma `empresa` com uma `fonte_dados` pendente.

### Fase 2 — Extração, normalização e revisão
- Conector Google: resolver link (inclusive curto) até `place_id` ou consulta de texto; chamar Places API (New) com `X-Goog-FieldMask` mínimo necessário (id, nome, endereço, telefones, site, horários, categoria principal, nota, total de avaliações, localização); reviews e fotos só se `GOOGLE_SHOW_REVIEWS`/`GOOGLE_SHOW_PHOTOS` estiverem `true`. Confirme os campos e endpoints na documentação vigente.
- Conector Instagram: interface pronta, retornando `status = nao_configurado` e ativando o **fallback**: pedir que o usuário cole a bio, informe telefone/WhatsApp e envie fotos (upload para Supabase Storage com validação de tipo e tamanho).
- Conector Manual: formulário curto (nome, ramo, descrição, contatos, endereço, horários, serviços, fotos).
- Normalizador + estruturador (7.1) gravando `campo_extraido` com origem e confiança; regra de conflito: Google prevalece em endereço, telefone e horários; Instagram/manual prevalecem em bio, tom e fotos.
- Tela **/empresa/[id]/revisao**: lista de campos com selo de confiança (alta/média/baixa), edição inline, botão "Confirmar dados". Campos de baixa confiança destacados. Registrar `campo_editado` em `evento_pesquisa`.
- Checkbox obrigatório de **declaração de titularidade** ("Sou dono ou responsável por este negócio"), gravando `declaracao_titularidade_em`.
- **Aceite:** com `USE_MOCKS=true`, o fluxo link → revisão funciona ponta a ponta com fixtures de pelo menos 3 negócios diferentes; testes de integração com respostas gravadas da Places API.

### Fase 3 — Caixa de estilo, geração e prévia
- Tela **/empresa/[id]/estilo**: título "Como você quer o visual do seu site?", textarea até 500 caracteres com contador, chips clicáveis (Moderno, Elegante, Divertido, Minimalista, Rústico) que preenchem o texto, campo opcional de referência, botão "Gerar meu site".
- Implementar 7.2, 7.3, 7.4 e o validador de contraste.
- Biblioteca de componentes: Hero, Serviços, Prova social, Galeria, Sobre, Localização (endereço, horários e link para o mapa; sem embed obrigatório), Contato, FAQ (opcional), Rodapé (com link para o perfil de origem). Tema por **CSS variables** a partir do `estilo_config`. Fontes via `next/font`.
- 3 templates-base (`servicos`, `comercio`, `alimentacao`) definindo ordem e seções padrão; o estilo do usuário ajusta o template.
- Botão de WhatsApp: `https://wa.me/55DDDNUMERO?text=...` com mensagem pré-preenchida citando o nome da empresa; helper com testes (normalização de números brasileiros).
- Prévia responsiva (celular/desktop) dentro do app. Site sem dado essencial = seção omitida, nunca placeholder falso.
- **Aceite:** para 3 fixtures e 3 pedidos de estilo diferentes, sites visivelmente diferentes; contraste AA em todos; guarda anti-alucinação com testes cobrindo casos de telefone/endereço/preço inventados.

### Fase 4 — Publicação, rastreamento e painel
- Middleware de subdomínio: `nome.NEXT_PUBLIC_ROOT_DOMAIN` renderiza o site publicado (em dev, `nome.localhost:3000`). Validação de slug (só `a-z0-9-`, 3 a 40 caracteres, lista de reservados: `www`, `app`, `api`, `admin`, `painel`, `login`, etc.) e checagem de unicidade.
- Publicar/despublicar. Só publica com declaração de titularidade registrada.
- SEO: `title`, `description`, Open Graph, `sitemap`/`robots` básicos e **JSON-LD `LocalBusiness`** gerado dos dados.
- Botão flutuante de WhatsApp, imagens otimizadas com carregamento preguiçoso.
- Rastreamento sem dados pessoais: endpoint `/api/track` grava `visita` e `clique_whatsapp` em `evento_metrica` (sem IP, com limite de taxa).
- Painel **/painel**: sites da empresa, status, visitas e cliques (últimos 7 e 30 dias).
- **Aceite:** publicar em `*.localhost:3000`, abrir o site, clicar no WhatsApp e ver as contagens no painel; Lighthouse mobile com desempenho, acessibilidade e SEO altos (registre os números no relatório da fase).

### Fase 5 — Ajustes por texto, robustez e coleta para o TCC
- Editor: prévia + edição direta de textos/imagens + caixa "Peça um ajuste" (7.5), histórico de versões com "desfazer".
- Limite de taxa por usuário nas rotas de IA e de extração; tratamento de erros com mensagens úteis; estados de carregamento e vazio.
- Widget final "O site ficou como você pediu?" (nota 1–5) gravando em `feedback`; tela opcional com as 10 perguntas do SUS.
- Teste E2E (Playwright) do fluxo principal em modo mock: cadastro → link → revisão → estilo → gerar → publicar.
- `README.md` final, `docs/arquitetura.md` (diagramas em Mermaid) e `docs/decisoes.md` revisado.
- **Aceite:** E2E passa; `npm run build` passa; checklist de segurança da seção 10 conferido no relatório.

## 9. Métricas de pesquisa (registrar em `evento_pesquisa`)

Para responder às hipóteses do TCC, registre com timestamp e `empresa_id`:

| Evento | Uso |
| --- | --- |
| `link_colado` | Início do cronômetro do tempo até publicar |
| `extracao_concluida` | Duração da extração e fonte usada |
| `campo_editado` | Quantos campos o usuário corrigiu (esforço de correção) |
| `revisao_confirmada` | Fim da etapa de revisão |
| `estilo_enviado` | Texto do pedido e caracteres |
| `site_gerado` | Duração da geração, modelo usado, se houve nova tentativa |
| `ajuste_solicitado` | Texto do pedido de ajuste |
| `site_publicado` | Fim do cronômetro |
| `nota_fidelidade` | Nota 1–5 do usuário sobre o estilo |

Crie um script `npm run relatorio:tcc` que exporta essas métricas por empresa em CSV: tempo total (link → publicação), percentual de campos editados, número de ajustes e nota de fidelidade.

## 10. Checklist de segurança e privacidade

- Todas as rotas de API exigem autenticação, exceto `/api/track` e a renderização pública.
- RLS ativo e testado: um usuário não lê nem altera dados de outro.
- SSRF bloqueado (lista de hosts permitidos, sem IPs privados, timeout, limite de redirecionamentos).
- Uploads: tipo, tamanho e quantidade limitados; nomes de arquivo gerados pelo servidor.
- Saída da IA sempre validada por Zod; nunca usar `dangerouslySetInnerHTML` com conteúdo gerado ou extraído.
- Slugs de subdomínio validados; reservados bloqueados.
- Logs sem chaves e sem dados pessoais desnecessários.
- Política de privacidade e pedido de exclusão de dados (função "Excluir minha conta e dados").

## 11. Fora do escopo do MVP

Loja virtual, blog, múltiplas páginas, domínio próprio automatizado, pagamentos, integração real com a API do Instagram (apenas interface e fallback), edição colaborativa.

## 12. Definição de pronto (geral)

- Fluxo completo funcionando com `USE_MOCKS=true` **e** com Google real quando a chave existir.
- `lint`, `typecheck`, `test` e `build` passando.
- Relatórios `docs/fases/fase0.md` a `fase5.md` escritos.
- Nenhum segredo no repositório.

---

**Comece agora pela Fase 0.** Antes de escrever código, leia este arquivo inteiro, liste em até 10 linhas o plano da Fase 0 e as suposições que fizer, e então execute.
