-- Bucket de Storage para fotos enviadas pelo usuário (fallback do Instagram e
-- formulário manual, Fase 2). Leitura pública (as fotos aparecem no site
-- publicado); upload restrito a usuários autenticados. Nomes de arquivo são
-- gerados pelo servidor (uuid), nunca o nome original enviado pelo usuário
-- (seção 10 do CLAUDE.md).

insert into storage.buckets (id, name, public)
values ('fotos-empresa', 'fotos-empresa', true)
on conflict (id) do nothing;

create policy "fotos_empresa_leitura_publica" on storage.objects for select using (
  bucket_id = 'fotos-empresa'
);

create policy "fotos_empresa_upload_autenticado" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'fotos-empresa');

create policy "fotos_empresa_exclusao_autenticada" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'fotos-empresa');
