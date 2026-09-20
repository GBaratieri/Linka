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

## Fase 2

- **Extração síncrona em vez de polling**: o CLAUDE.md descreve "status persistido no banco e
  polling no cliente". Implementamos a extração disparada de forma síncrona (aguardada durante o
  carregamento de `/empresa/[id]`) em vez de um endpoint de status com polling no cliente — as duas
  abordagens gravam `fonte_dados.status` da mesma forma, e a extração real (Places API) deve levar
  no máximo alguns segundos. A lógica em si (`lib/conectores/normalizador.ts`) é uma função pura,
  então trocar para polling/fila de verdade depois é uma mudança de infraestrutura na página, não
  de lógica.
- **Resolução de link do Google Maps**: em vez de tentar extrair um `place_id` de dentro da URL
  (o parâmetro `data=` do Maps é opaco), extraímos o nome da empresa do próprio caminho da URL
  (`/maps/place/Nome+Da+Empresa/...` ou `?q=...`). Links curtos (`maps.app.goo.gl`, `g.page`,
  `share.google`) são resolvidos antes via `lib/seguranca/ssrf.ts` (primeiro uso real desse
  módulo, construído na Fase 1). **A extração do nome/consulta a partir da URL não foi testada
  contra a API real** — precisa ser confirmada com uma chave de verdade antes de considerar pronto
  para produção; o request/response da Places API em si já tem cobertura de teste com `fetch`
  mockado (ver decisão abaixo, pós-CLAUDE.md v2).
- **Fotos do Google adiadas**: `GOOGLE_SHOW_PHOTOS=true` ligaria o campo `places.photos` no
  `X-Goog-FieldMask`, mas as fotos da Places API (New) só vêm como uma referência opaca
  (`photo.name`) que precisa de uma chamada separada ao endpoint de mídia (com a chave da API) e
  depois um upload pro nosso Storage — a mesma esteira que já existe para as fotos do
  Instagram/manual. Implementar isso agora seria antecipar uma funcionalidade atrás de uma flag que
  o próprio `.env.example` já mantém desligada até revisão dos termos da API. `buscarDadosGoogle`
  sempre devolve `fotos: null` por enquanto.
- **Instagram passa pelo estruturador de IA; Manual não**: a bio do Instagram é texto livre — vira
  `dadosBrutos` para o mesmo estruturador (7.1) usado pelo Google, que classifica segmento e separa
  a descrição. Já o formulário manual tem campos explícitos e tipados (o usuário escolhe o
  segmento, digita o telefone no campo certo etc.) — não faz sentido pedir pra uma IA "estruturar"
  dado que já chegou estruturado; `lib/conectores/manual.ts` grava direto em `campo_extraido` com
  `confianca: 'alta'`.
- **Resolução de conflito por tabela de prioridade** (`lib/conectores/normalizador.ts`): dois
  `Set`s (`CAMPOS_PRIORIDADE_GOOGLE`, `CAMPOS_PRIORIDADE_MANUAL_OU_INSTAGRAM`) implementam a regra
  da seção 8 do CLAUDE.md. Fora desses campos, quem tiver maior confiança vence; empatado, a
  extração mais nova vence — decisão de detalhe não coberta explicitamente pela regra do CLAUDE.md.
- **Edição inline limitada a campos escalares**: a tela de revisão permite editar direto nome,
  segmento, descrição, contatos e endereço (todos texto/select simples). Horários, serviços e
  fotos aparecem como leitura nesta fase — construir editores ricos (adicionar/remover horário por
  dia, reordenar fotos) é uma quantidade de UI própria que não parece justificada ainda para o MVP;
  o usuário pode revisitar o formulário manual/Instagram para recolher esses dados se precisar.
- **`empresa.nome`/`empresa.segmento` sincronizados a partir de `campo_extraido`**
  (`sincronizarNomeESegmento`): sempre que `nome`/`segmento` são gravados ou editados em
  `campo_extraido` (extração automática, formulário manual ou edição na revisão), as colunas da
  tabela `empresa` são atualizadas também. `campo_extraido` continua sendo a fonte de verdade
  completa (com origem e confiança); `empresa.nome`/`segmento` existem como um atalho para o resto
  do app (painel, subdomínio, SEO) não precisar sempre juntar com `campo_extraido`.
- **`fonte_dados.status` como máquina de estados da navegação**: `/empresa/[id]/page.tsx` decide
  para onde mandar o usuário só olhando o status (`pendente` do Google dispara a extração;
  `pendente` do manual manda pro formulário; `nao_configurado` manda pro fallback do Instagram;
  `erro` mostra um botão de tentar de novo; `ok` manda pra revisão). Reaproveita a mesma coluna já
  criada na Fase 1, sem precisar de um campo de "etapa atual" separado.
- **`z.toJSONSchema()` para a ferramenta da Anthropic**: em vez de escrever o JSON Schema da
  ferramenta (`tool_choice` forçado) à mão — duplicando o contrato que já existe como schema Zod —
  geramos com o conversor nativo do Zod 4 (`lib/ia/estruturador.ts`). Uma fonte de verdade só; o
  mesmo problema que motivou a decisão abaixo sobre `campo_extraido`.
- **`campo_extraido` com tipos derivados, tabelas antigas mantidas como estão**: `tipos-banco.ts`
  ganhou um tipo utilitário (`LinhaCompleta<Row, ChavesOpcionais>`) que deriva `Insert`/`Update` de
  `Row` via `Omit`/`Partial`, usado só na tabela nova (`campo_extraido`). As quatro tabelas
  anteriores (da Fase 1) continuam com os tipos escritos à mão — não foram tocadas para não mexer
  em código já testado fora do que a Fase 2 pediu; migrar todas para o padrão novo fica como um
  possível cleanup futuro.
- **Formulário manual: horários em 7 linhas fixas, serviços em texto livre**: em vez de um editor
  dinâmico de horários (adicionar/remover intervalos por dia) e uma lista dinâmica de serviços
  (nome + descrição cada), o formulário tem 7 linhas fixas (seg–dom, cada uma com "abre"/"fecha"
  opcionais) e um textarea de serviços (um por linha, sem descrição individual). Cobre o caso comum
  sem a complexidade de gerenciar arrays dinâmicos no React; o usuário sempre pode refinar depois
  editando os campos na revisão.
- **Fixtures do Google**: 3 negócios fictícios (`padaria`, `oficina`, `moveis`) escolhidos de forma
  determinística por um hash simples da URL, o suficiente para o critério de aceite ("pelo menos 3
  negócios diferentes") sem precisar de uma tabela de URLs reais mapeadas a mão.

## Revisão de código (pós-Fase 2)

Revisão completa do diff da Fase 2 (10 ângulos: linha a linha, comportamento removido, rastreamento
entre arquivos, armadilhas de linguagem, consistência mock/real, reuso, simplificação, eficiência,
altitude e conformidade com o `CLAUDE.md`). 11 problemas de corretude encontrados e corrigidos:

- **`gravarDadosManual` duplicava linhas em `campo_extraido` ao reenviar o formulário** (duplo
  clique, "voltar" do navegador): a função sempre fazia `insert`, sem checar linha existente.
  Extraído um `gravarCampos` compartilhado (usado também por `gravarCamposExtraidos`) que consulta o
  que já existe e faz upsert/update por campo; adicionada constraint única
  `(empresa_id, campo)` em `campo_extraido` como segunda camada de proteção contra corridas
  simultâneas.
- **Fallback do Instagram sem tratamento de erro**: uma falha da IA (ou da gravação) depois que as
  fotos já tinham sido enviadas ao Storage virava uma exceção não tratada, travando a fonte em
  `nao_configurado` para sempre. `processarFallbackInstagram` agora captura o erro e devolve
  `{ sucesso: false }`; a action mostra uma mensagem amigável e o usuário pode reenviar o mesmo
  formulário (o status não muda em caso de falha).
- **Políticas de Storage do bucket `fotos-empresa` sem checagem de dono**: as políticas de
  upload/exclusão só verificavam `bucket_id`, diferente de toda tabela do banco (que sempre junta com
  `empresa.usuario_id = auth.uid()`). Corrigidas para exigir que a pasta do objeto
  (`storage.foldername(name)[1]`, que é o `empresa_id`) pertença ao usuário autenticado.
- **Limpar o nome na revisão dessincronizava `empresa.nome`**: o campo não era obrigatório no
  formulário e `sincronizarNomeESegmento` ignorava silenciosamente um valor vazio, deixando
  `campo_extraido` e `empresa.nome` divergentes sem erro nenhum. Nome e ramo agora são obrigatórios
  em `/revisao` (com validação também no servidor, não só no `required` do HTML), e a sincronização
  propaga o valor tal como está em vez de pular linhas com valor vazio.
- **Horário de almoço (dois intervalos no mesmo dia) era truncado**: `converterHorariosGoogle` usava
  um regex sem `/g`, capturando só o primeiro intervalo de uma linha como
  `"08:00 – 12:00, 14:00 – 18:00"`. Agora itera todos os intervalos da linha.
- **Erros de leitura/escrita do Supabase eram ignorados** em `gravarCampos`/`sincronizarNomeESegmento`:
  uma falha de RLS ou de rede fazia a extração terminar como "ok" mesmo sem gravar nada. Os erros
  agora são propagados (lançados) e capturados pelos chamadores (`processarFonteDados`,
  `processarFallbackInstagram`, `salvarManual`, `confirmarRevisao`), que voltam a marcar a fonte como
  erro ou mostrar uma mensagem em vez de seguir como se nada tivesse acontecido.
- **`/empresa/[id]` podia mascarar um erro real já gravado**: depois de rodar a extração do Google, a
  página fazia uma segunda consulta para "descobrir" o status, e se essa consulta falhasse caía de
  volta no valor antigo (`pendente`) — levando o usuário pra revisão com o formulário vazio em vez de
  mostrar a tela de erro. `processarFonteDados` agora devolve o status final diretamente, sem
  segunda consulta (e sem repetir, para o Instagram, a suposição de qual status ele sempre resulta).
- **Fixture do Google inventava o nome "Empresa sem nome no Google"** quando a Places API não
  retorna nome nenhum — violando a regra de nunca inventar dado (seção 2 do CLAUDE.md). Agora fica
  como string vazia e sem marcação de origem/confiança, então nunca é gravado em `campo_extraido`; o
  campo aparece em branco e obrigatório na revisão, pedindo que o usuário preencha.
- **`.single()` em `fonte_dados` virava 404 se a linha ainda não existisse** (ex.: pequena
  defasagem logo após criar a empresa) em vez do comportamento mais tolerante da tela anterior à
  Fase 2. Trocado por `.maybeSingle()`.
- **Upload de fotos deixava arquivos órfãos no Storage em falha parcial**: `enviarFotos` só validava
  tipo/tamanho durante o loop de upload, então um arquivo inválido no meio do lote deixava os
  anteriores já enviados sem nenhuma referência no banco. Agora valida tipo/tamanho de todo o lote
  antes de enviar qualquer arquivo, e remove do Storage o que já tinha sido enviado se um upload
  seguinte falhar.
- **Link do Instagram sem usuário no caminho (ex.: só `instagram.com`) inventava um "nome"**:
  `extrairHandle` caía para o hostname da URL, que virava um nome de empresa sem sentido com
  confiança alta. Agora devolve `null` quando não há handle, e `nome`/`contato.instagram` só são
  marcados (e preenchidos) quando existe um handle de verdade.

## Retrofit para o escopo de produto real (pós-CLAUDE.md v2)

O CLAUDE.md foi substituído por uma versão de produto comercial com assinatura (era MVP de TCC).
Como as Fases 0–2 já tinham sido entregues e aprovadas sob a versão antiga, alguns pontos
precisaram ser ajustados para alinhar com a nova versão antes de seguir para fases novas:

- **`evento_pesquisa` renomeada para `evento_produto`**: a versão nova do CLAUDE.md chama a mesma
  tabela de métricas de "produto" em vez de "pesquisa" (o produto deixou de ser só um artefato de
  TCC). Como nada tinha sido aplicado a um Supabase real ainda, a migração original
  (`20260919120000_esquema_dominio.sql`) foi editada diretamente em vez de criar uma migração de
  rename em cima — evita duas migrações ("cria com nome errado, depois renomeia") num esquema que
  nunca foi implantado. Todo o código que gravava em `evento_pesquisa` (`criarEmpresa.ts`,
  `normalizador.ts`, `revisao/actions.ts`) e os testes que mockavam essa tabela foram atualizados.
- **`usuario.papel` (`cliente` | `admin`)**: adicionado à mesma migração original, com default
  `'cliente'` — o trigger `handle_new_user` não precisou mudar porque o default cobre o caso comum
  (cadastro normal); só a Fase 7 (`/admin`) vai de fato promover alguém a `admin`, direto no banco.
- **Custo de IA registrado em `evento_produto`** (seção 8.6 do CLAUDE.md): `lib/metricas/custos.ts`
  estima o custo em reais a partir de tokens de entrada/saída e do modelo, usando `USD_BRL` e uma
  tabela de preços por modelo (só Sonnet e Haiku cadastrados por enquanto; modelo desconhecido usa o
  preço do Sonnet como estimativa conservadora — **conferir a tabela de preços vigente da Anthropic
  antes de usar isso para decidir limites de gasto de verdade**). `ia/estruturador.ts` não grava no
  banco diretamente (mantém a camada de IA sem depender do Supabase); em vez disso,
  `estruturarEmpresa` aceita um callback opcional `aoUsarIA`, chamado só no caminho real (nunca no
  mock) com os tokens consumidos, e quem chama (`processarFonteDados`, `processarFallbackInstagram`)
  decide como registrar. Reportar mesmo quando a extração falhou nas duas tentativas, já que os
  tokens foram consumidos de qualquer forma.
  - Achado colateral de TypeScript: com `strict` ligado, `{ ...variavel }` não type-checa quando
    `variavel` é uma `let` que foi reatribuída dentro de uma closure assíncrona (`aoUsarIA: (uso) =>
    { usoIA = uso; }`) e só depois estreitada com `!== null` — o compilador não consegue provar que
    o spread é seguro nesse caminho específico, mesmo copiando para uma `const` antes. Contornado
    com uma função auxiliar (`payloadComUso`) que recebe o valor já não-nulo como parâmetro comum
    (não uma variável historicamente mutada em closure), onde o spread type-checa normalmente.
- **Conector Google: busca só por id, depois um Place Details** (seção 3 do CLAUDE.md, "preferir
  busca só por IDs, sem custo, seguida de um Place Details"): antes, `buscarDadosGoogle` fazia uma
  única Text Search já pedindo todos os campos. Agora primeiro busca só `places.id` (SKU "IDs Only"
  da Places API, mais barato) e só then, com o id confirmado, faz **um** Place Details com o
  `X-Goog-FieldMask` completo — o Place Details usa nomes de campo sem o prefixo `places.` porque
  devolve um objeto único, não uma lista. Adicionada cobertura de teste com `fetch` mockado para as
  duas chamadas (algo que não existia antes: a Fase 2 só tinha testado o caminho mock). A ressalva
  já registrada acima continua valendo — o formato exato da URL/consulta ainda não foi validado
  contra a API real.
## Verificador de consistência (Fase 2 do CLAUDE.md v2)

Confirmado com o dono do projeto: uma empresa passa a poder ter mais de uma `fonte_dados` — depois
de confirmar a revisão de uma fonte, o usuário pode voltar e complementar com outra (ex.: começou
pelo Google, depois adiciona o Instagram) para o verificador ter o que comparar.

- **`campo_extraido` passa a ter uma linha por origem, não mais uma por campo**: a constraint única
  virou `(empresa_id, campo, origem)` (era `(empresa_id, campo)`, adicionada na leva de correções
  anterior — ver migração `20260920120000_campo_extraido_unico_por_origem.sql`). A resolução de
  conflito (qual valor "vale", seção 8 do CLAUDE.md) deixou de acontecer na gravação e passou para a
  leitura: `gravarCampos` agora é um upsert simples por origem (sem mais precisar consultar o que já
  existe antes de decidir inserir ou atualizar — cada origem só mexe na própria linha), e uma nova
  função `calcularValoresEfetivos` (`lib/conectores/normalizador.ts`) reduz as várias linhas de um
  campo a um valor efetivo, reaproveitando a mesma `deveSubstituirCampo` de antes. Uma edição do
  usuário na revisão (`editado_pelo_usuario=true`) sempre vence nesse cálculo, mesmo contra uma
  origem com prioridade (ex.: Google no telefone) — é a palavra final dele sobre o próprio dado, não
  mais uma fonte disputando prioridade com as outras.
- **`lib/consistencia/comparador.ts`**: compara nome, telefone, endereço e horário (os campos
  citados na Fase 2 do CLAUDE.md v2) entre as origens não editadas pelo usuário; um campo só
  entra na lista se pelo menos duas origens tiverem valores diferentes para ele. A tela de revisão
  mostra um aviso com o valor de cada fonte ao lado do campo divergente ("Google: X · Instagram:
  Y") — o próprio campo de edição já existente serve como a escolha do usuário, sem precisar de um
  seletor novo.
- **Complementar depois da revisão, não no `/novo`**: em vez de pedir os dois links já na entrada
  (mudaria o fluxo "um único link" aprovado na Fase 1), a tela `/empresa/[id]/adicionar-fonte` só
  fica acessível depois que `empresa.declaracao_titularidade_em` já está preenchido (ou seja, a
  primeira revisão já foi confirmada). Uma empresa só pode ter uma fonte por tipo — pedir a mesma
  fonte de novo não traria dado novo para comparar; `lib/conectores/adicionarFonte.ts` rejeita nesse
  caso. Depois de adicionar, o fluxo volta para `/empresa/[id]`, que já sabe processar a fonte mais
  recente pendente (nenhuma mudança precisou ser feita ali).
- **Comparação de `horarios` por igualdade estrutural simples (`JSON.stringify`)**: originalmente
  sensível à ordem dos itens do array — corrigido na revisão de código abaixo ("Revisão de código
  do retrofit").

## Revisão de código do retrofit (pós-CLAUDE.md v2)

Revisão completa do diff do retrofit (10 ângulos, mesmo processo das revisões anteriores). 10
achados corrigidos (6 confirmados por leitura direta do código + 4 plausíveis):

- **Instagram nunca registrava `extracao_concluida` em modo mock**: o insert em `evento_produto`
  só acontecia `if (uso !== null)`, e `uso` é sempre `null` sob `USE_MOCKS=true` (o padrão) — o
  Google, em compensação, sempre registrava. Corrigido para seguir o mesmo padrão do Google
  (`instagram.ts`): grava sempre, com ou sem dado de custo.
- **Confirmar a revisão sem reescrever nada nunca travava a escolha do usuário**: o formulário já
  vem pré-preenchido com o valor efetivo, então `novoValor === valorAtual` e o campo nunca ganhava
  `editado_pelo_usuario=true` — o que, combinado com o Google sempre prevalecendo em
  endereço/telefone/horário, permitia que uma segunda fonte (Google) sobrescrevesse silenciosamente
  um dado que o dono preencheu à mão. Corrigido: `confirmarRevisao` agora sempre grava (com
  `editado_pelo_usuario=true`) todo campo não deixado em branco, mudando o texto ou não — confirmar
  a revisão é a palavra final do usuário sobre o valor mostrado, não só sobre uma edição de texto.
  Campos deixados em branco continuam sem travar (uma fonte futura ainda pode preenchê-los). O
  evento `campo_editado` (esforço de correção, seção 9) continua só disparando quando o texto muda
  de verdade.
- **Aviso de divergência nunca sumia**: `encontrarDivergencias` só excluía a linha que o usuário
  editou, deixando as outras linhas (ainda discordantes entre si) continuarem acionando o aviso.
  Corrigido: quando qualquer linha de um campo tem `editado_pelo_usuario=true`, o campo inteiro sai
  da comparação.
- **Custo de IA perdido quando a chamada de retry lança erro** (não só quando devolve saída
  inválida): `estruturarComIA` reestruturado com `try/finally` para sempre reportar o uso acumulado
  até ali, mesmo que a segunda tentativa lance uma exceção (rede, limite de taxa) em vez de só
  devolver um schema inválido.
- **Corrida ao adicionar uma segunda fonte**: a checagem "já existe uma fonte desse tipo?" antes do
  insert tinha uma janela de corrida (dois envios simultâneos podiam passar pela checagem antes de
  qualquer um dos dois inserir) e descartava o erro da própria consulta. Adicionada uma constraint
  única `fonte_dados(empresa_id, tipo)` no banco (migração
  `20260920140000_fonte_dados_unica_por_tipo.sql`); `adicionarFonte.ts` agora tenta inserir direto e
  trata a violação da constraint (código Postgres `23505`) como o erro esperado — sem checagem
  prévia, sem corrida.
- **Confirmar a revisão marcava linhas divergentes/perdedoras como confirmadas**: o
  `.update({confirmado_pelo_usuario: true}).eq('empresa_id', ...)` (não tocado pelo retrofit
  original) passou a atingir todas as origens de cada campo assim que `campo_extraido` virou
  multi-origem. Corrigido: marca como confirmadas só as linhas que são efetivamente o valor atual
  de cada campo (recalculado depois das edições), via `.in('id', idsEfetivos)`.
- **Migração da Fase 1 editada em cima em vez de uma migração nova**: o rename
  `evento_pesquisa`→`evento_produto` e a coluna `usuario.papel` editavam
  `20260919120000_esquema_dominio.sql` diretamente, dependendo da suposição de que ela nunca tinha
  sido aplicada a um Supabase real — e a regra 5 nova do CLAUDE.md pede confirmação explícita antes
  de qualquer migração que altere o que já foi entregue. Revertido: a migração original volta ao
  estado de antes do retrofit, e as duas mudanças passam a ser uma migração própria
  (`20260920130000_evento_produto_e_usuario_papel.sql`), aplicada por `ALTER` em cima do esquema
  original.
- **Colisão entre duas gravações em `origem='manual'`** (uma edição na revisão e uma segunda fonte
  manual complementar, via `adicionarFonte.ts`): analisando com cuidado, isso não é perda silenciosa
  de dado — como as duas gravam no mesmo slot `origem='manual'`, a mais recente sempre vence de
  forma consistente (a mesma regra de "a ação mais recente do usuário vale" que já se aplica a duas
  edições seguidas na própria revisão). Documentado como comportamento intencional (comentário em
  `lib/conectores/manual.ts`), não um caso especial a corrigir.
- **Comparação de horário sensível à ordem do array**: `encontrarDivergencias` comparava `horarios`
  com `JSON.stringify` direto, que depende da ordem dos itens — o Google sempre devolve os dias em
  ordem, mas um horário extraído por IA a partir da bio do Instagram não tem essa garantia.
  Corrigido: ordena os itens do array antes de comparar (`normalizarValor`), então duas listas com
  os mesmos horários em ordem diferente não são mais tratadas como divergência.

Dois achados plausíveis ficaram fora desse ciclo de correção por serem estruturais/de design (não
bugs pontuais): unificar as quatro listas hardcoded de campos (`CAMPOS_COMPARAVEIS`,
`CAMPOS_PRIORIDADE_*`, `CAMPOS_EDITAVEIS`, `CAMPOS_FORMULARIO`) num registro só, e tornar
`/empresa/[id]/page.tsx` ciente de que uma empresa pode ter mais de uma `fonte_dados` (hoje
funciona por já pegar sempre a mais recente, mas sem um mecanismo explícito para isso). Ficam para
quando fizerem mais sentido — o segundo, em especial, junto de um redesenho maior do fluxo de
onboarding quando a Fase 4+ da v2 chegar.

## Testes de RLS (fechando uma lacuna da Fase 1 do CLAUDE.md v2)

O critério de aceite da Fase 1 na versão v2 do CLAUDE.md pede "testes de RLS (usuário A não vê
dados do B)" — um requisito novo que não existia na v1 e que, por natureza, não dá para satisfazer
com o cliente Supabase mockado usado no resto da suíte (RLS é aplicado pelo próprio Postgres).

- **Supabase CLI local via Docker**: instalada como devDependency (`npm install -D supabase`),
  com `supabase init`/`supabase start` subindo Postgres + Auth + Storage locais e aplicando todas
  as migrações — a mesma rodada serviu de verificação de que as migrações do retrofit (rename,
  constraints novas) aplicam limpo num Postgres real, não só no mock.
- **`tests/rls/`, config e script separados**: `vitest.rls.config.ts` roda só
  `tests/rls/**/*.test.ts`, excluído do `npm run test` padrão (`vitest.config.ts`) — o padrão
  precisa continuar rápido e sem nenhuma credencial externa (regra 4 do CLAUDE.md); os testes de
  RLS dependem de Docker rodando e são acionados à parte via `npm run test:rls`. `fileParallelism:
  false` porque os testes criam/apagam usuários reais no mesmo banco.
- **Dois usuários de teste via API admin** (`tests/rls/helpers.ts`): cria usuários confirmados
  direto (sem precisar de e-mail), devolve um cliente autenticado como cada um (chave anon +
  sessão própria — sujeito a RLS de verdade, diferente do cliente service role usado só para
  preparar/limpar o cenário). `tests/rls/isolamento.test.ts` cobre select/update/delete/insert
  cruzados entre as duas contas em `empresa`, `fonte_dados`, `campo_extraido`, `evento_produto` e
  `usuario` — 9 testes, todos passando contra o Postgres local.
- **Chaves de desenvolvimento do Supabase local hardcoded como padrão** em `helpers.ts`: não são
  segredo — são as mesmas chaves (`JWT_SECRET` fixo) que toda instância local do Supabase usa com a
  configuração default, documentadas publicamente. Sobrescrevíveis por variável de ambiente se a
  config local mudar.
