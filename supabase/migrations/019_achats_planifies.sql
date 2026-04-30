-- ================================================================
-- 019 - Module Sonorisation : achats planifiés
-- ================================================================

create type public.priorite_achat as enum ('urgent', 'normal', 'faible');
create type public.statut_achat   as enum ('en_attente', 'approuve', 'commande', 'recu');

create table public.achats_planifies (
  id              bigserial primary key,
  nom             text        not null,
  quantite        integer     not null default 1 check (quantite > 0),
  budget_estime   numeric(12, 2),
  priorite        public.priorite_achat not null default 'normal',
  statut          public.statut_achat   not null default 'en_attente',
  notes           text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.achats_planifies is 'Liste des achats de matériel planifiés';

create trigger achats_planifies_updated_at
  before update on public.achats_planifies
  for each row execute procedure public.set_updated_at();

create index on public.achats_planifies (statut);
create index on public.achats_planifies (priorite);

-- ── RLS ──────────────────────────────────────────────────────────

alter table public.achats_planifies enable row level security;

-- Tous les membres connectés peuvent consulter
create policy "achats_planifies_select"
  on public.achats_planifies for select
  to authenticated
  using (true);

-- Responsable et au-dessus peuvent créer
create policy "achats_planifies_insert"
  on public.achats_planifies for insert
  to authenticated
  with check (public.has_role('responsable'));

-- Responsable et au-dessus peuvent modifier
create policy "achats_planifies_update"
  on public.achats_planifies for update
  to authenticated
  using (public.has_role('responsable'));

-- Responsable et au-dessus peuvent supprimer
create policy "achats_planifies_delete"
  on public.achats_planifies for delete
  to authenticated
  using (public.has_role('responsable'));
