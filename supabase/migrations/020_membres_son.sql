-- ================================================================
-- 020 - Module Sonorisation : membres de l'équipe
-- ================================================================

create type public.role_son as enum ('responsable', 'technicien', 'assistant');

create table public.membres_son (
  id          bigserial primary key,
  prenom      text        not null,
  nom         text        not null,
  telephone   text,
  email       text,
  role        public.role_son not null default 'technicien',
  actif       boolean     not null default true,
  notes       text,
  created_by  uuid        references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.membres_son is 'Membres de l''équipe de sonorisation';

create trigger membres_son_updated_at
  before update on public.membres_son
  for each row execute procedure public.set_updated_at();

create index on public.membres_son (actif);
create index on public.membres_son (role);

-- ── RLS ──────────────────────────────────────────────────────────

alter table public.membres_son enable row level security;

create policy "membres_son_select"
  on public.membres_son for select
  to authenticated
  using (true);

create policy "membres_son_insert"
  on public.membres_son for insert
  to authenticated
  with check (public.has_role('responsable'));

create policy "membres_son_update"
  on public.membres_son for update
  to authenticated
  using (public.has_role('responsable'));

create policy "membres_son_delete"
  on public.membres_son for delete
  to authenticated
  using (public.has_role('admin'));
