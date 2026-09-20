# Fase 2 — Extração, normalização e revisão

## O que foi feito

- **Conector Google** (`lib/conectores/google.ts`): resolve links (inclusive curtos, via
  `lib/seguranca/ssrf.ts`) até uma consulta de texto e chama a Places API (New)
  (`places:searchText`) com o menor `X-Goog-FieldMask` necessário (id, nome, endereço, telefone,
  site, horários, categoria principal, nota, total de avaliações, localização). Reviews só entram
  no field mask se `GOOGLE_SHOW_REVIEWS=true`; fotos ficam de fora por enquanto (ver
  `docs/decisoes.md`, "Fotos do Google adiadas").
- **Conector Instagram** (`lib/conectores/instagram.ts`): sem API real (fora de escopo, seção 11),
  sempre devolve `status = nao_configurado` e aciona o fallback — bio, telefone/WhatsApp e fotos,
  enviadas em `/empresa/[id]/instagram`.
- **Conector Manual**: formulário em `/empresa/[id]/manual` (nome, ramo, descrição, contatos,
  endereço, horários por dia da semana, serviços, fotos), gravado direto em `campo_extraido` com
  confiança máxima — sem passar pela IA, já que o usuário preencheu campos já estruturados.
- **Estruturador de IA** (`lib/ia/estruturador.ts`, seção 7.1): usa `@anthropic-ai/sdk` com tool
  use e `tool_choice` forçado; o schema da ferramenta é gerado do próprio Zod
  (`z.toJSONSchema`), sem duplicar o contrato à mão. Uma nova tentativa se a saída vier inválida.
  Em `USE_MOCKS=true`, usa heurísticas determinísticas (mapeamento direto para dados do Google,
  classificação por palavra-chave para bio do Instagram) em vez de chamar a API.
- **Normalizador** (`lib/conectores/normalizador.ts`): grava o resultado do estruturador em
  `campo_extraido`, aplicando a regra de conflito da seção 8 (Google prevalece em
  endereço/telefone/horários; Instagram/manual prevalecem em descrição/fotos) contra o que já
  existir para a empresa. Também orquestra a extração (`processarFonteDados`) e mantém
  `empresa.nome`/`segmento` sincronizados com `campo_extraido`.
- **Upload de fotos** (`lib/conectores/uploadFotos.ts` + migração de Storage): valida tipo (JPEG,
  PNG, WebP), tamanho (5MB) e quantidade (6) antes de enviar ao bucket `fotos-empresa`; nomes de
  arquivo gerados pelo servidor (uuid).
- **Tela `/empresa/[id]/revisao`**: lista os campos extraídos com selo de confiança
  (alta/média/baixa), edição inline para os campos de texto (nome, segmento, descrição, contatos,
  endereço — ver `docs/decisoes.md` sobre o que ainda não é editável nesta fase), horários/
  serviços/fotos/avaliação do Google em modo leitura, checkbox obrigatório de declaração de
  titularidade e botão "Confirmar dados". Edições registram `campo_editado`; a confirmação registra
  `revisao_confirmada` e grava `declaracao_titularidade_em`.
- **`/empresa/[id]`** agora decide para onde mandar o usuário conforme o status da fonte (extração
  automática, formulário manual, fallback do Instagram, tela de erro com "tentar novamente", ou
  revisão) em vez de ser só uma tela de confirmação estática.
- **Migração de domínio**: `campo_extraido` adicionada aos tipos do Supabase
  (`lib/supabase/tipos-banco.ts`, com um padrão novo que deriva `Insert`/`Update` de `Row`).

## Decisões

Ver a seção "Fase 2" em [`docs/decisoes.md`](../decisoes.md) — vale destacar a decisão de rodar a
extração de forma síncrona em vez de polling, e o adiamento das fotos do Google.

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

## Resultado dos checks (nesta máquina)

- `npm run lint` — sem erros.
- `npm run typecheck` — sem erros.
- `npm run test` — 15 arquivos, 126 testes, todos passando. Cobrem: o estruturador com dados do
  Google e do Instagram (sem inventar campo ausente), a resolução de conflito entre fontes, o
  pipeline completo (`processarFonteDados`) para 3 negócios fictícios diferentes, o upload de
  fotos (tipo/tamanho/quantidade), o formulário manual e o fallback do Instagram, e a renderização
  dos formulários (React Testing Library).
- `npm run build` — build de produção concluído com sucesso.
- Verificado manualmente: todas as rotas novas (`/empresa/[id]`, `.../manual`, `.../instagram`,
  `.../revisao`, `.../confirmado`) redirecionam para `/login` sem sessão, confirmando que o `proxy`
  da Fase 1 protege corretamente as rotas aninhadas novas.

## Pendências / próximos passos

- **Sem Supabase real neste ambiente** (mesma limitação da Fase 1): o fluxo completo autenticado
  (link → extração → revisão → confirmação) foi validado com testes automatizados cobrindo toda a
  lógica de negócio com um cliente Supabase mockado, e com verificação manual das rotas/proteção de
  acesso — mas não foi possível clicar no fluxo de ponta a ponta num navegador com dados reais.
- **Resolução de link do Google não testada contra a API real** — a estratégia de extrair o nome
  da empresa da URL e usar Text Search (New) é razoável, mas precisa ser confirmada com uma chave
  de verdade e URLs reais do Google Maps antes de considerar pronta para produção (ver
  `docs/decisoes.md`).
- **Fotos do Google**: `GOOGLE_SHOW_PHOTOS` não tem implementação ainda (sempre retorna
  `fotos: null`), mesmo que a variável seja `true`. Fica para quando os termos da Places API forem
  revisados (a própria flag já nasce `false` no `.env.example`).
- **Edição inline parcial**: horários, serviços e fotos aparecem como leitura na revisão; editar
  esses exige voltar ao formulário manual/Instagram por enquanto.
- Nenhuma credencial foi solicitada ou usada — tudo roda com `USE_MOCKS=true`.

---

**Fase 2 concluída — aguardando aprovação.**
