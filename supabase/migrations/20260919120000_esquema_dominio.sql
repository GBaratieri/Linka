-- Esquema de domínio do SiteLink (Fase 1).
-- Ver seção 5 do CLAUDE.md para o modelo de dados completo.
--
-- Convenções:
--   * Enums são representados como `text` + `check`, não como tipos nativos do
--     Postgres, para facilitar evolução futura (adicionar um valor não exige
--     `alter type`). Ver docs/decisoes.md.
--   * Toda tabela tem `id uuid` e `criado_em timestamptz`.
--   * RLS habilitado em todas as tabelas; políticas por dono (via `usuario_id`
--     direto ou por join até `empresa`/`site`).
--   * `empresa.nome`, `empresa.segmento` e `empresa.cidade` são opcionais na
--     criação: só são preenchidos após a extração (Fase 2). O sistema nunca
--     inventa esses valores (regra 2 do CLAUDE.md).

create extension if not exists pgcrypto;

-- usuario -------------------------------------------------------------------
-- Espelha auth.users com os campos específicos da aplicação. Populada
-- automaticamente por um trigger em auth.users (ver função abaixo).
create table public.usuario (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  email text not null,
  aceitou_lgpd_em timestamptz,
  criado_em timestamptz not null default now()
);

alter table public.usuario enable row level security;

create policy "usuario_select_own" on public.usuario
  for select using (id = auth.uid());

create policy "usuario_update_own" on public.usuario
  for update using (id = auth.uid());

-- Cria automaticamente a linha em public.usuario quando um usuário se
-- cadastra via Supabase Auth. O aceite de LGPD é lido de
-- raw_user_meta_data (enviado pelo formulário de cadastro).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuario (id, nome, email, aceitou_lgpd_em)
  values (
    new.id,
    new.raw_user_meta_data ->> 'nome',
    new.email,
    case
      when (new.raw_user_meta_data ->> 'aceitou_lgpd')::boolean is true then now()
      else null
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- empresa ---------------------------------------------------------------
create table public.empresa (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  nome text,
  segmento text check (segmento in ('servicos', 'comercio', 'alimentacao', 'outro')),
  cidade text,
  declaracao_titularidade_em timestamptz,
  criado_em timestamptz not null default now()
);

create index empresa_usuario_id_idx on public.empresa (usuario_id);

alter table public.empresa enable row level security;

create policy "empresa_all_own" on public.empresa
  for all
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- fonte_dados -------------------------------------------------------------
create table public.fonte_dados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa (id) on delete cascade,
  tipo text not null check (tipo in ('google', 'instagram', 'manual')),
  url text,
  status text not null default 'pendente'
    check (status in ('pendente', 'ok', 'erro', 'nao_configurado')),
  bruto jsonb,
  coletado_em timestamptz,
  criado_em timestamptz not null default now()
);

create index fonte_dados_empresa_id_idx on public.fonte_dados (empresa_id);

alter table public.fonte_dados enable row level security;

create policy "fonte_dados_all_own" on public.fonte_dados
  for all
  using (
    exists (
      select 1 from public.empresa
      where empresa.id = fonte_dados.empresa_id
        and empresa.usuario_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.empresa
      where empresa.id = fonte_dados.empresa_id
        and empresa.usuario_id = auth.uid()
    )
  );

-- campo_extraido ------------------------------------------------------------
create table public.campo_extraido (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa (id) on delete cascade,
  campo text not null,
  valor jsonb,
  origem text not null check (origem in ('google', 'instagram', 'manual')),
  confianca text not null check (confianca in ('alta', 'media', 'baixa')),
  confirmado_pelo_usuario boolean not null default false,
  editado_pelo_usuario boolean not null default false,
  criado_em timestamptz not null default now()
);

create index campo_extraido_empresa_id_idx on public.campo_extraido (empresa_id);

alter table public.campo_extraido enable row level security;

create policy "campo_extraido_all_own" on public.campo_extraido
  for all
  using (
    exists (
      select 1 from public.empresa
      where empresa.id = campo_extraido.empresa_id
        and empresa.usuario_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.empresa
      where empresa.id = campo_extraido.empresa_id
        and empresa.usuario_id = auth.uid()
    )
  );

-- template --------------------------------------------------------------
-- Tabela de referência (não pertence a um usuário). Leitura pública,
-- escrita restrita à service role (nenhuma política de insert/update/delete
-- para os papéis authenticated/anon).
create table public.template (
  id uuid primary key default gen_random_uuid(),
  segmento text not null check (segmento in ('servicos', 'comercio', 'alimentacao', 'outro')),
  nome text not null,
  componentes jsonb not null,
  criado_em timestamptz not null default now()
);

alter table public.template enable row level security;

create policy "template_select_public" on public.template
  for select using (true);

-- site --------------------------------------------------------------------
create table public.site (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa (id) on delete cascade,
  subdominio text not null unique,
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  publicado_em timestamptz,
  criado_em timestamptz not null default now()
);

create index site_empresa_id_idx on public.site (empresa_id);

alter table public.site enable row level security;

-- A leitura pública dos sites publicados acontece só no servidor, via
-- service role (que ignora RLS) — nunca direto do cliente. Aqui só o dono
-- tem acesso.
create policy "site_all_own" on public.site
  for all
  using (
    exists (
      select 1 from public.empresa
      where empresa.id = site.empresa_id
        and empresa.usuario_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.empresa
      where empresa.id = site.empresa_id
        and empresa.usuario_id = auth.uid()
    )
  );

-- versao_site -------------------------------------------------------------
create table public.versao_site (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.site (id) on delete cascade,
  template_id uuid references public.template (id),
  estilo_texto text,
  estilo_config jsonb,
  conteudo jsonb,
  criado_em timestamptz not null default now()
);

create index versao_site_site_id_idx on public.versao_site (site_id);

alter table public.versao_site enable row level security;

create policy "versao_site_all_own" on public.versao_site
  for all
  using (
    exists (
      select 1 from public.site
      join public.empresa on empresa.id = site.empresa_id
      where site.id = versao_site.site_id
        and empresa.usuario_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.site
      join public.empresa on empresa.id = site.empresa_id
      where site.id = versao_site.site_id
        and empresa.usuario_id = auth.uid()
    )
  );

-- evento_metrica ------------------------------------------------------------
-- Gravado pelo endpoint público /api/track usando a service role (que
-- ignora RLS). Aqui só existe política de leitura para o dono, para
-- alimentar o painel (Fase 4).
create table public.evento_metrica (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.site (id) on delete cascade,
  tipo text not null check (tipo in ('visita', 'clique_whatsapp')),
  data timestamptz not null default now(),
  origem text
);

create index evento_metrica_site_id_idx on public.evento_metrica (site_id);

alter table public.evento_metrica enable row level security;

create policy "evento_metrica_select_own" on public.evento_metrica
  for select
  using (
    exists (
      select 1 from public.site
      join public.empresa on empresa.id = site.empresa_id
      where site.id = evento_metrica.site_id
        and empresa.usuario_id = auth.uid()
    )
  );

-- evento_pesquisa -----------------------------------------------------------
-- Métricas de validação do TCC (seção 9 do CLAUDE.md). Gravadas pelo
-- próprio usuário autenticado durante o fluxo (link_colado, campo_editado,
-- etc.), por isso permite insert/select do dono.
create table public.evento_pesquisa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa (id) on delete cascade,
  tipo text not null,
  payload jsonb,
  criado_em timestamptz not null default now()
);

create index evento_pesquisa_empresa_id_idx on public.evento_pesquisa (empresa_id);

alter table public.evento_pesquisa enable row level security;

create policy "evento_pesquisa_insert_own" on public.evento_pesquisa
  for insert
  with check (
    exists (
      select 1 from public.empresa
      where empresa.id = evento_pesquisa.empresa_id
        and empresa.usuario_id = auth.uid()
    )
  );

create policy "evento_pesquisa_select_own" on public.evento_pesquisa
  for select
  using (
    exists (
      select 1 from public.empresa
      where empresa.id = evento_pesquisa.empresa_id
        and empresa.usuario_id = auth.uid()
    )
  );

-- feedback ------------------------------------------------------------------
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.site (id) on delete cascade,
  nota_fidelidade_estilo smallint check (nota_fidelidade_estilo between 1 and 5),
  sus jsonb,
  comentario text,
  criado_em timestamptz not null default now()
);

create index feedback_site_id_idx on public.feedback (site_id);

alter table public.feedback enable row level security;

create policy "feedback_all_own" on public.feedback
  for all
  using (
    exists (
      select 1 from public.site
      join public.empresa on empresa.id = site.empresa_id
      where site.id = feedback.site_id
        and empresa.usuario_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.site
      join public.empresa on empresa.id = site.empresa_id
      where site.id = feedback.site_id
        and empresa.usuario_id = auth.uid()
    )
  );
