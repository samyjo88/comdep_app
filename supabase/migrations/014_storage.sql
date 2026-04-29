-- ============================================================
-- 014 - Supabase Storage : buckets et politiques
-- ============================================================

-- Bucket public pour les images de couverture, avatars, etc.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medias',
  'medias',
  true,
  52428800,  -- 50 Mo max
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
        'video/mp4', 'video/webm',
        'audio/mpeg', 'audio/ogg',
        'application/pdf']
)
on conflict (id) do nothing;

-- Bucket privé pour les documents internes
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  104857600,  -- 100 Mo max
  array['application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do nothing;

-- ── Politiques Storage : bucket medias (public) ───────────

create policy "storage_medias_select_public"
  on storage.objects for select
  using (bucket_id = 'medias');

create policy "storage_medias_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'medias'
    and public.has_role('redacteur')
  );

create policy "storage_medias_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'medias'
    and (auth.uid()::text = (storage.foldername(name))[1]
         or public.has_role('admin'))
  );

create policy "storage_medias_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'medias'
    and (auth.uid()::text = (storage.foldername(name))[1]
         or public.has_role('admin'))
  );

-- ── Politiques Storage : bucket documents (privé) ─────────

create policy "storage_documents_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents');

create policy "storage_documents_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and public.has_role('redacteur')
  );

create policy "storage_documents_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (auth.uid()::text = (storage.foldername(name))[1]
         or public.has_role('admin'))
  );
