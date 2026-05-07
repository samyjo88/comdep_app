-- ================================================================
-- 028 — Module Annonces : membres de l'équipe
-- ================================================================

create type public.role_annonce as enum ('responsable', 'redacteur', 'lecteur');

create table public.membres_annonces (
  id          bigserial primary key,
  prenom      text                    not null,
  nom         text                    not null,
  telephone   text,
  email       text,
  role        public.role_annonce     not null default 'redacteur',
  actif       boolean                 not null default true,
  notes       text,
  created_by  uuid                    references auth.users(id) on delete set null,
  created_at  timestamptz             not null default now(),
  updated_at  timestamptz             not null default now()
);

comment on table public.membres_annonces is 'Membres de l''équipe chargée des annonces';

create trigger membres_annonces_updated_at
  before update on public.membres_annonces
  for each row execute procedure public.set_updated_at();

create index on public.membres_annonces (actif);
create index on public.membres_annonces (role);

-- ── RLS ──────────────────────────────────────────────────────────

alter table public.membres_annonces enable row level security;

create policy "membres_annonces_select"
  on public.membres_annonces for select
  to authenticated
  using (true);

create policy "membres_annonces_insert"
  on public.membres_annonces for insert
  to authenticated
  with check (public.has_role('responsable'));

create policy "membres_annonces_update"
  on public.membres_annonces for update
  to authenticated
  using (public.has_role('responsable'));

create policy "membres_annonces_delete"
  on public.membres_annonces for delete
  to authenticated
  using (public.has_role('admin'));
