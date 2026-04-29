-- ============================================================
-- 013 - RLS : annonces et lectures
-- ============================================================

alter table public.annonces enable row level security;
alter table public.annonce_lectures enable row level security;

-- ── annonces ──────────────────────────────────────────────

-- Un utilisateur connecté voit :
-- · toutes les annonces sans équipe (globales)
-- · les annonces de ses équipes
-- · ses propres annonces
create policy "annonces_select"
  on public.annonces for select
  to authenticated
  using (
    (date_expiration is null or date_expiration > now())
    and (
      equipe_id is null
      or auteur_id = auth.uid()
      or public.has_role('admin')
      or exists (
        select 1 from public.equipe_membres em
        where em.equipe_id = annonces.equipe_id
          and em.user_id   = auth.uid()
      )
    )
  );

-- Admin/responsable peuvent créer des annonces globales
-- Un rédacteur peut créer des annonces pour son équipe
create policy "annonces_insert"
  on public.annonces for insert
  to authenticated
  with check (
    auteur_id = auth.uid()
    and (
      public.has_role('responsable')
      or (
        equipe_id is not null
        and public.has_role('redacteur')
        and exists (
          select 1 from public.equipe_membres em
          where em.equipe_id = annonces.equipe_id
            and em.user_id   = auth.uid()
        )
      )
    )
  );

-- L'auteur ou admin peut modifier l'annonce
create policy "annonces_update"
  on public.annonces for update
  to authenticated
  using (
    auteur_id = auth.uid()
    or public.has_role('admin')
  );

-- L'auteur ou admin peut supprimer l'annonce
create policy "annonces_delete"
  on public.annonces for delete
  to authenticated
  using (
    auteur_id = auth.uid()
    or public.has_role('admin')
  );

-- ── annonce_lectures ──────────────────────────────────────

-- Un utilisateur voit ses propres lectures (admin voit tout)
create policy "annonce_lectures_select"
  on public.annonce_lectures for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.has_role('admin')
  );

-- Un utilisateur ne peut marquer que ses propres lectures
create policy "annonce_lectures_insert"
  on public.annonce_lectures for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "annonce_lectures_delete"
  on public.annonce_lectures for delete
  to authenticated
  using (user_id = auth.uid());
