-- ============================================================
--  034 — Programmation centralisée des cultes  (idempotent)
--
--  Un culte (dominical, de semaine ou spécial) est programmé une
--  seule fois puis partagé par tous les modules : annonces,
--  cantiques (setlist), sonorisation, captation et projection.
-- ============================================================

-- ── 1. Nouvelles informations sur le culte ───────────────────

ALTER TABLE public.cultes ADD COLUMN IF NOT EXISTS type_culte  text NOT NULL DEFAULT 'dominical';
ALTER TABLE public.cultes ADD COLUMN IF NOT EXISTS heure_debut time;
ALTER TABLE public.cultes ADD COLUMN IF NOT EXISTS libelle     text;

DO $$
BEGIN
  ALTER TABLE public.cultes
    ADD CONSTRAINT cultes_type_culte_check
    CHECK (type_culte IN ('dominical', 'semaine', 'special'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.cultes.type_culte  IS 'dominical, semaine (culte en semaine) ou special';
COMMENT ON COLUMN public.cultes.heure_debut IS 'Heure de début du culte';
COMMENT ON COLUMN public.cultes.libelle     IS 'Nom du culte (ex. « Culte d''action de grâce »)';

-- Les cultes existants hors dimanche deviennent des cultes de semaine
UPDATE public.cultes
   SET type_culte = 'semaine'
 WHERE type_culte = 'dominical'
   AND extract(dow FROM date_culte) <> 0;

-- ── 2. Rattrapage : un même culte visible dans tous les modules ──

-- Chaque culte à venir a sa ligne de planning sonorisation
INSERT INTO public.planning_son (date_culte, statut)
SELECT c.date_culte, 'planifie'
  FROM public.cultes c
 WHERE c.date_culte >= current_date
ON CONFLICT (date_culte) DO NOTHING;

-- Chaque date planifiée par la sonorisation existe comme culte
INSERT INTO public.cultes (date_culte, statut, type_culte)
SELECT p.date_culte,
       'a_venir',
       CASE WHEN extract(dow FROM p.date_culte) = 0 THEN 'dominical' ELSE 'semaine' END
  FROM public.planning_son p
 WHERE p.date_culte >= current_date
ON CONFLICT (date_culte) DO NOTHING;
