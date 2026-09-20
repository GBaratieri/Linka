-- Corrige as políticas de Storage do bucket fotos-empresa (Fase 2): as
-- políticas originais só verificavam bucket_id, sem checar que a pasta
-- (empresa_id) do objeto pertence ao usuário autenticado — diferente de
-- todas as outras tabelas, que usam join com empresa.usuario_id = auth.uid().
-- Isso permitia que qualquer usuário autenticado enviasse ou apagasse fotos
-- de outra empresa no mesmo bucket público (uploadFotos.ts nomeia os
-- arquivos como "<empresa_id>/<uuid>.<ext>").

drop policy if exists "fotos_empresa_upload_autenticado" on storage.objects;
drop policy if exists "fotos_empresa_exclusao_autenticada" on storage.objects;

create policy "fotos_empresa_upload_autenticado" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'fotos-empresa'
    and exists (
      select 1 from public.empresa
      where empresa.id::text = (storage.foldername(name))[1]
        and empresa.usuario_id = auth.uid()
    )
  );

create policy "fotos_empresa_exclusao_autenticada" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'fotos-empresa'
    and exists (
      select 1 from public.empresa
      where empresa.id::text = (storage.foldername(name))[1]
        and empresa.usuario_id = auth.uid()
    )
  );
