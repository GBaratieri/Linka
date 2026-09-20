-- Fase 2 do CLAUDE.md v2 (retrofit para o escopo de produto real): adiciona
-- usuario.papel e renomeia evento_pesquisa para evento_produto.
--
-- Antes essas duas mudanças editavam a migração original da Fase 1
-- diretamente (20260919120000_esquema_dominio.sql). Isso dependia da
-- suposição de que ela nunca tinha sido aplicada a um Supabase real — sem
-- confirmação explícita disso, e com a regra 5 do CLAUDE.md agora pedindo
-- confirmação explícita antes de qualquer migração que altere o esquema já
-- entregue, essas mudanças passam a ser uma migração própria, por cima do
-- esquema original, em vez de reescrevê-lo.

alter table public.usuario
  add column papel text not null default 'cliente' check (papel in ('cliente', 'admin'));

alter table public.evento_pesquisa rename to evento_produto;
alter index evento_pesquisa_empresa_id_idx rename to evento_produto_empresa_id_idx;

drop policy "evento_pesquisa_insert_own" on public.evento_produto;
drop policy "evento_pesquisa_select_own" on public.evento_produto;

create policy "evento_produto_insert_own" on public.evento_produto
  for insert
  with check (
    exists (
      select 1 from public.empresa
      where empresa.id = evento_produto.empresa_id
        and empresa.usuario_id = auth.uid()
    )
  );

create policy "evento_produto_select_own" on public.evento_produto
  for select
  using (
    exists (
      select 1 from public.empresa
      where empresa.id = evento_produto.empresa_id
        and empresa.usuario_id = auth.uid()
    )
  );
