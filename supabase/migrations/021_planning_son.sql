-- ================================================================
-- 021 - Module Sonorisation : planning hebdomadaire
-- ================================================================

create type public.statut_culte as enum ('planifie', 'confirme', 'passe');

create table public.planning_son (
  id              bigserial primary key,
  date_culte      date        not null unique,
  responsable_id  bigint      references public.membres_son(id) on delete set null,
  assistant1_id   bigint      references public.membres_son(id) on delete set null,
  assistant2_id   bigint      references public.membres_son(id) on delete set null,
  statut          public.statut_culte not null default 'planifie',
  notes           text,
  created_by      uuid        references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.planning_son is 'Planning hebdomadaire de l''équipe sonorisation';

create trigger planning_son_updated_at
  before update on public.planning_son
  for each row execute procedure public.set_updated_at();

create index on public.planning_son (date_culte);
create index on public.planning_son (statut);

-- ── RLS ──────────────────────────────────────────────────────────

alter table public.planning_son enable row level security;

create policy "planning_son_select"
  on public.planning_son for select
  to authenticated
  using (true);

create policy "planning_son_insert"
  on public.planning_son for insert
  to authenticated
  with check (public.has_role('responsable'));

create policy "planning_son_update"
  on public.planning_son for update
  to authenticated
  using (public.has_role('responsable'));

create policy "planning_son_delete"
  on public.planning_son for delete
  to authenticated
  using (public.has_role('responsable'));
