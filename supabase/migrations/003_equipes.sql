-- ============================================================
-- 003 - Équipes et membres d'équipes
-- ============================================================

create table public.equipes (
  id           bigint generated always as identity primary key,
  nom          text not null,
  description  text,
  couleur      text default '#6366f1',   -- couleur d'affichage (hex)
  actif        boolean not null default true,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.equipes is 'Équipes du département de communication';

create trigger equipes_updated_at
  before update on public.equipes
  for each row execute procedure public.set_updated_at();

-- Membres d'une équipe (un utilisateur peut appartenir à plusieurs équipes)
create table public.equipe_membres (
  id           bigint generated always as identity primary key,
  equipe_id    bigint not null references public.equipes(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  est_chef     boolean not null default false,   -- chef d'équipe
  created_at   timestamptz not null default now(),
  constraint equipe_membres_unique unique (equipe_id, user_id)
);

comment on table public.equipe_membres is 'Association utilisateurs ↔ équipes';
