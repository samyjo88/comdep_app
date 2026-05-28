-- ================================================================
-- 029 - Autoriser les membres actifs de l'équipe sono à gérer
--       le matériel sonorisation (INSERT / UPDATE)
-- ================================================================

-- Fonction : vérifie que l'utilisateur connecté est un membre actif
-- de l'équipe sonorisation (correspondance par email).
create or replace function public.is_membre_son()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from   public.membres_son ms
    join   auth.users          u  on lower(u.email) = lower(ms.email)
    where  u.id      = auth.uid()
    and    ms.actif  = true
  );
$$;

comment on function public.is_membre_son()
  is 'Retourne true si l''utilisateur connecté est un membre actif de l''équipe sonorisation';

-- ── Mise à jour des politiques RLS de materiel_sono ───────────────────────

-- INSERT : responsable+ OU membre actif de la sono
drop policy if exists "materiel_sono_insert" on public.materiel_sono;
create policy "materiel_sono_insert"
  on public.materiel_sono for insert
  to authenticated
  with check (public.has_role('responsable') or public.is_membre_son());

-- UPDATE : responsable+ OU membre actif de la sono
drop policy if exists "materiel_sono_update" on public.materiel_sono;
create policy "materiel_sono_update"
  on public.materiel_sono for update
  to authenticated
  using (public.has_role('responsable') or public.is_membre_son());

-- DELETE : admin uniquement (inchangé)
