-- ============================================================
-- 012 - RLS : evenements et tâches
-- ============================================================

alter table public.evenements enable row level security;
alter table public.evenement_taches enable row level security;

-- ── evenements ────────────────────────────────────────────

-- Les événements publics sont visibles par tous (même anonymes)
create policy "evenements_select_public"
  on public.evenements for select
  using (est_public = true and statut != 'annule');

-- Les utilisateurs connectés voient tous les événements (même privés)
create policy "evenements_select_authenticated"
  on public.evenements for select
  to authenticated
  using (true);

-- Admin/responsable peuvent créer des événements
create policy "evenements_insert"
  on public.evenements for insert
  to authenticated
  with check (public.has_role('responsable'));

-- Le responsable de l'événement ou admin peut modifier
create policy "evenements_update_responsable"
  on public.evenements for update
  to authenticated
  using (
    responsable_id = auth.uid()
    or created_by   = auth.uid()
    or public.has_role('admin')
  );

-- Seul admin peut supprimer un événement
create policy "evenements_delete_admin"
  on public.evenements for delete
  to authenticated
  using (public.has_role('admin'));

-- ── evenement_taches ──────────────────────────────────────

-- Les membres de l'équipe liée à l'événement voient les tâches
create policy "evenement_taches_select"
  on public.evenement_taches for select
  to authenticated
  using (
    public.has_role('responsable')
    or exists (
      select 1 from public.evenements e
      join public.equipe_membres em on em.equipe_id = e.equipe_id
      where e.id        = evenement_taches.evenement_id
        and em.user_id  = auth.uid()
    )
    or assignee_id = auth.uid()
  );

-- Admin/responsable peuvent créer des tâches
create policy "evenement_taches_insert"
  on public.evenement_taches for insert
  to authenticated
  with check (public.has_role('responsable'));

-- La personne assignée peut cocher une tâche (terminee)
-- Admin/responsable peuvent tout modifier
create policy "evenement_taches_update"
  on public.evenement_taches for update
  to authenticated
  using (
    assignee_id = auth.uid()
    or public.has_role('responsable')
  );

create policy "evenement_taches_delete"
  on public.evenement_taches for delete
  to authenticated
  using (public.has_role('responsable'));
