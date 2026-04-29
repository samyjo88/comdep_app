-- ================================================================
-- 017 - Ajout des champs état, quantité et maintenance
--       sur la table materiel_sono
-- ================================================================

create type public.etat_materiel as enum ('neuf', 'bon', 'use', 'en_panne');

alter table public.materiel_sono
  add column if not exists quantite_total      integer              not null default 1
                            constraint quantite_total_pos check (quantite_total >= 1),
  add column if not exists quantite_disponible integer              not null default 1
                            constraint quantite_dispo_pos check (quantite_disponible >= 0),
  add column if not exists etat                public.etat_materiel not null default 'bon',
  add column if not exists en_reparation       boolean              not null default false,
  add column if not exists dernier_nettoyage   date,
  add column if not exists prochain_nettoyage  date;

comment on column public.materiel_sono.quantite_total
  is 'Nombre total d''unités possédées';
comment on column public.materiel_sono.quantite_disponible
  is 'Nombre d''unités actuellement disponibles (≤ quantite_total)';
comment on column public.materiel_sono.etat
  is 'État physique de l''équipement';
comment on column public.materiel_sono.en_reparation
  is 'Vrai si au moins une unité est en cours de réparation';

-- Index pour les filtres stats
create index if not exists materiel_sono_etat_idx         on public.materiel_sono (etat);
create index if not exists materiel_sono_reparation_idx   on public.materiel_sono (en_reparation);
create index if not exists materiel_sono_nettoyage_idx    on public.materiel_sono (prochain_nettoyage);
