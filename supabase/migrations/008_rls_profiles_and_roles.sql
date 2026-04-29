-- ============================================================
-- 008 - RLS : profiles et user_roles
-- ============================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- ── profiles ──────────────────────────────────────────────

-- Tout utilisateur connecté peut voir tous les profils actifs
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (actif = true);

-- Un utilisateur voit toujours son propre profil (même inactif)
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Un utilisateur peut modifier son propre profil
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Seuls admin et super_admin peuvent modifier n'importe quel profil
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.has_role('admin'));

-- Seuls admin/super_admin peuvent désactiver un compte (pas de delete)
create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated
  using (public.has_role('admin'));

-- ── user_roles ────────────────────────────────────────────

-- Tout utilisateur connecté voit les rôles
create policy "user_roles_select_authenticated"
  on public.user_roles for select
  to authenticated
  using (true);

-- Seuls admin/super_admin peuvent modifier les rôles
create policy "user_roles_insert_admin"
  on public.user_roles for insert
  to authenticated
  with check (public.has_role('admin'));

create policy "user_roles_update_admin"
  on public.user_roles for update
  to authenticated
  using (public.has_role('admin'));

create policy "user_roles_delete_admin"
  on public.user_roles for delete
  to authenticated
  using (public.has_role('admin'));
