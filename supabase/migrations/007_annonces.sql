-- ============================================================
-- 007 - Annonces internes
-- ============================================================

create table public.annonces (
  id           bigint generated always as identity primary key,
  titre        text not null,
  contenu      text not null,
  priorite     int not null default 0 check (priorite between 0 and 5),
  epinglee     boolean not null default false,
  auteur_id    uuid references public.profiles(id) on delete set null,
  -- null = visible par tous ; sinon restreint à une équipe
  equipe_id    bigint references public.equipes(id) on delete set null,
  date_expiration timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.annonces is 'Annonces et communications internes';

create trigger annonces_updated_at
  before update on public.annonces
  for each row execute procedure public.set_updated_at();

-- Lectures : savoir qui a lu une annonce
create table public.annonce_lectures (
  annonce_id  bigint not null references public.annonces(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  lu_at       timestamptz not null default now(),
  primary key (annonce_id, user_id)
);
