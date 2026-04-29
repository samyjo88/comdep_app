-- ============================================================
-- 006 - Événements
-- ============================================================

create table public.evenements (
  id              bigint generated always as identity primary key,
  titre           text not null,
  description     text,
  lieu            text,
  date_debut      timestamptz not null,
  date_fin        timestamptz,
  statut          public.statut_evenement not null default 'planifie',
  categorie_id    bigint references public.categories(id) on delete set null,
  equipe_id       bigint references public.equipes(id) on delete set null,
  image_id        bigint references public.medias(id) on delete set null,
  responsable_id  uuid references public.profiles(id) on delete set null,
  est_public      boolean not null default true,   -- visible sans connexion
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.evenements is 'Événements de l''église à communiquer';

create trigger evenements_updated_at
  before update on public.evenements
  for each row execute procedure public.set_updated_at();

-- Tâches communication liées à un événement
create table public.evenement_taches (
  id            bigint generated always as identity primary key,
  evenement_id  bigint not null references public.evenements(id) on delete cascade,
  titre         text not null,
  description   text,
  assignee_id   uuid references public.profiles(id) on delete set null,
  terminee      boolean not null default false,
  echeance      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger evenement_taches_updated_at
  before update on public.evenement_taches
  for each row execute procedure public.set_updated_at();
