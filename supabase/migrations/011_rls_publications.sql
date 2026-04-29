-- ============================================================
-- 011 - RLS : publications et commentaires
-- ============================================================

alter table public.publications enable row level security;
alter table public.publication_commentaires enable row level security;

-- ── publications ──────────────────────────────────────────

-- Les publications publiées sont visibles par tous (y compris anonymes)
create policy "publications_select_public"
  on public.publications for select
  using (statut = 'publie');

-- Les utilisateurs connectés voient aussi leurs propres brouillons
-- et toutes les publications de leur équipe
create policy "publications_select_authenticated"
  on public.publications for select
  to authenticated
  using (
    statut = 'publie'
    or auteur_id = auth.uid()
    or exists (
      select 1 from public.equipe_membres em
      where em.equipe_id = publications.equipe_id
        and em.user_id   = auth.uid()
    )
  );

-- Admin/responsable voient tout
create policy "publications_select_admin"
  on public.publications for select
  to authenticated
  using (public.has_role('responsable'));

-- Un rédacteur (ou au-dessus) peut créer une publication
create policy "publications_insert"
  on public.publications for insert
  to authenticated
  with check (
    public.has_role('redacteur')
    and auteur_id = auth.uid()
  );

-- L'auteur peut modifier sa publication si elle n'est pas encore publiée
create policy "publications_update_auteur"
  on public.publications for update
  to authenticated
  using (
    auteur_id = auth.uid()
    and statut in ('brouillon', 'en_revision')
  );

-- Admin/responsable peuvent modifier n'importe quelle publication
create policy "publications_update_admin"
  on public.publications for update
  to authenticated
  using (public.has_role('responsable'));

-- Admin peut supprimer une publication
create policy "publications_delete_admin"
  on public.publications for delete
  to authenticated
  using (public.has_role('admin'));

-- L'auteur peut supprimer ses propres brouillons
create policy "publications_delete_auteur"
  on public.publications for delete
  to authenticated
  using (
    auteur_id = auth.uid()
    and statut = 'brouillon'
  );

-- ── publication_commentaires ──────────────────────────────

-- Tout utilisateur connecté voit les commentaires des publications visibles
create policy "pub_commentaires_select"
  on public.publication_commentaires for select
  to authenticated
  using (true);

-- Tout utilisateur connecté peut commenter
create policy "pub_commentaires_insert"
  on public.publication_commentaires for insert
  to authenticated
  with check (auteur_id = auth.uid());

-- Un utilisateur peut supprimer ses propres commentaires
-- Un admin peut supprimer n'importe quel commentaire
create policy "pub_commentaires_delete"
  on public.publication_commentaires for delete
  to authenticated
  using (
    auteur_id = auth.uid()
    or public.has_role('admin')
  );
