-- ============================================================
-- 010 - RLS : categories et medias
-- ============================================================

alter table public.categories enable row level security;
alter table public.medias enable row level security;

-- ── categories ────────────────────────────────────────────

-- Tout le monde (même anonyme) peut lire les catégories
create policy "categories_select_all"
  on public.categories for select
  using (true);

-- Seuls admin/responsable peuvent gérer les catégories
create policy "categories_insert"
  on public.categories for insert
  to authenticated
  with check (public.has_role('responsable'));

create policy "categories_update"
  on public.categories for update
  to authenticated
  using (public.has_role('responsable'));

create policy "categories_delete"
  on public.categories for delete
  to authenticated
  using (public.has_role('admin'));

-- ── medias ────────────────────────────────────────────────

-- Tout utilisateur connecté peut voir les médias
create policy "medias_select_authenticated"
  on public.medias for select
  to authenticated
  using (true);

-- Tout rédacteur et au-dessus peut uploader un média
create policy "medias_insert"
  on public.medias for insert
  to authenticated
  with check (
    public.has_role('redacteur')
    and uploaded_by = auth.uid()
  );

-- L'auteur du média ou un admin peut le modifier
create policy "medias_update"
  on public.medias for update
  to authenticated
  using (
    uploaded_by = auth.uid()
    or public.has_role('admin')
  );

-- L'auteur du média ou un admin peut le supprimer
create policy "medias_delete"
  on public.medias for delete
  to authenticated
  using (
    uploaded_by = auth.uid()
    or public.has_role('admin')
  );
