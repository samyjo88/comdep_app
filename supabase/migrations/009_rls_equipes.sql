-- ============================================================
-- 009 - RLS : equipes et equipe_membres
-- ============================================================

alter table public.equipes enable row level security;
alter table public.equipe_membres enable row level security;

-- ── equipes ───────────────────────────────────────────────

-- Tous les utilisateurs connectés voient les équipes actives
create policy "equipes_select_authenticated"
  on public.equipes for select
  to authenticated
  using (actif = true);

-- Les admin/super_admin voient toutes les équipes (y compris inactives)
create policy "equipes_select_admin"
  on public.equipes for select
  to authenticated
  using (public.has_role('admin'));

-- Admin/responsable peuvent créer une équipe
create policy "equipes_insert"
  on public.equipes for insert
  to authenticated
  with check (public.has_role('responsable'));

-- Admin peut modifier n'importe quelle équipe
-- Le responsable (chef d'équipe) peut modifier les siennes
create policy "equipes_update_admin"
  on public.equipes for update
  to authenticated
  using (public.has_role('admin'));

create policy "equipes_update_chef"
  on public.equipes for update
  to authenticated
  using (
    exists (
      select 1 from public.equipe_membres em
      where em.equipe_id = equipes.id
        and em.user_id   = auth.uid()
        and em.est_chef  = true
    )
  );

-- Seul admin peut supprimer une équipe
create policy "equipes_delete_admin"
  on public.equipes for delete
  to authenticated
  using (public.has_role('admin'));

-- ── equipe_membres ────────────────────────────────────────

-- Tout utilisateur connecté voit les membres des équipes
create policy "equipe_membres_select"
  on public.equipe_membres for select
  to authenticated
  using (true);

-- Admin ou chef d'équipe peut ajouter un membre
create policy "equipe_membres_insert"
  on public.equipe_membres for insert
  to authenticated
  with check (
    public.has_role('admin')
    or exists (
      select 1 from public.equipe_membres em
      where em.equipe_id = equipe_membres.equipe_id
        and em.user_id   = auth.uid()
        and em.est_chef  = true
    )
  );

-- Admin ou chef d'équipe peut modifier l'appartenance
create policy "equipe_membres_update"
  on public.equipe_membres for update
  to authenticated
  using (
    public.has_role('admin')
    or exists (
      select 1 from public.equipe_membres em
      where em.equipe_id = equipe_membres.equipe_id
        and em.user_id   = auth.uid()
        and em.est_chef  = true
    )
  );

-- Admin ou chef d'équipe peut retirer un membre
create policy "equipe_membres_delete"
  on public.equipe_membres for delete
  to authenticated
  using (
    public.has_role('admin')
    or exists (
      select 1 from public.equipe_membres em
      where em.equipe_id = equipe_membres.equipe_id
        and em.user_id   = auth.uid()
        and em.est_chef  = true
    )
    -- Un utilisateur peut quitter une équipe lui-même
    or user_id = auth.uid()
  );
