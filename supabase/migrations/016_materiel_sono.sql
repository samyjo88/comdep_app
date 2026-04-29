-- ================================================================
-- 016 - Module Sonorisation : matériel et emprunts
-- ================================================================

create type public.categorie_materiel as enum (
  'microphone',
  'enceinte',
  'amplificateur',
  'mixette',
  'cable',
  'effet',
  'instrument',
  'accessoire',
  'autre'
);

create type public.statut_materiel as enum (
  'disponible',
  'emprunte',
  'en_maintenance',
  'hors_service'
);

create table public.materiel_sono (
  id               bigint generated always as identity primary key,
  nom              text not null,
  marque           text,
  modele           text,
  reference        text,
  numero_serie     text,
  categorie        public.categorie_materiel not null default 'autre',
  statut           public.statut_materiel not null default 'disponible',
  localisation     text,
  date_acquisition date,
  valeur_achat     numeric(10,2),
  notes            text,
  image_url        text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.materiel_sono is 'Inventaire du matériel de sonorisation';

create trigger materiel_sono_updated_at
  before update on public.materiel_sono
  for each row execute procedure public.set_updated_at();

-- Index pour les filtres fréquents
create index on public.materiel_sono (categorie);
create index on public.materiel_sono (statut);

-- ── RLS ──────────────────────────────────────────────────────────

alter table public.materiel_sono enable row level security;

-- Tous les membres connectés peuvent voir l'inventaire
create policy "materiel_sono_select"
  on public.materiel_sono for select
  to authenticated
  using (true);

-- Responsable et au-dessus peuvent ajouter du matériel
create policy "materiel_sono_insert"
  on public.materiel_sono for insert
  to authenticated
  with check (public.has_role('responsable'));

-- Responsable et au-dessus peuvent modifier
create policy "materiel_sono_update"
  on public.materiel_sono for update
  to authenticated
  using (public.has_role('responsable'));

-- Seul admin peut supprimer
create policy "materiel_sono_delete"
  on public.materiel_sono for delete
  to authenticated
  using (public.has_role('admin'));
