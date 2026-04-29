-- ================================================================
-- 018 - Ajout des champs de suivi de réparation sur materiel_sono
-- ================================================================

alter table public.materiel_sono
  add column if not exists description_reparation text,
  add column if not exists date_envoi_reparation   date;

comment on column public.materiel_sono.description_reparation
  is 'Description du problème de réparation en cours';
comment on column public.materiel_sono.date_envoi_reparation
  is 'Date d''envoi en réparation';
