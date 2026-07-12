-- ================================================================
-- 032 — Normalisation des emails des membres en minuscules
--
-- Supabase Auth stocke les emails des comptes en minuscules, mais
-- les fiches équipe saisies avec une casse mixte (ex. « Jemkoffi01@… »)
-- ne correspondaient plus à l'email du compte : le membre ne voyait
-- alors pas son module dans le tableau de bord.
-- ================================================================

update public.membres_son
  set email = lower(trim(email))
  where email is not null and email <> lower(trim(email));

update public.membres_captation
  set email = lower(trim(email))
  where email is not null and email <> lower(trim(email));

update public.membres_cm
  set email = lower(trim(email))
  where email is not null and email <> lower(trim(email));

update public.membres_annonces
  set email = lower(trim(email))
  where email is not null and email <> lower(trim(email));

update public.membres_projection
  set email = lower(trim(email))
  where email is not null and email <> lower(trim(email));
