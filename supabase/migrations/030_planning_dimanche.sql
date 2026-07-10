-- ================================================================
-- 030 - Planning centralisé des équipes du dimanche
-- ================================================================
-- Assigne 1 à 2 membres de service par département et par dimanche.
-- membre_id est stocké en texte car les tables membres_* utilisent
-- des types d'identifiants différents (bigint pour son/annonces,
-- uuid pour captation/projection/cm). La résolution du membre se
-- fait applicativement via (departement, membre_id).

CREATE TABLE public.planning_dimanche (
  id             bigserial    PRIMARY KEY,
  date_dimanche  date         NOT NULL,
  departement    text         NOT NULL
                              CHECK (departement IN ('son', 'projection', 'captation', 'community', 'annonces')),
  slot           smallint     NOT NULL
                              CHECK (slot IN (1, 2)),
  membre_id      text         NOT NULL,
  created_by     uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT planning_dimanche_date_dept_slot_unique UNIQUE (date_dimanche, departement, slot)
);

COMMENT ON TABLE  public.planning_dimanche IS 'Planning de service du dimanche : 1-2 membres par département';
COMMENT ON COLUMN public.planning_dimanche.slot IS 'Place de service : 1 (principal) ou 2 (second)';
COMMENT ON COLUMN public.planning_dimanche.membre_id IS 'Id du membre dans la table membres_<departement>, sérialisé en texte';

CREATE TRIGGER planning_dimanche_updated_at
  BEFORE UPDATE ON public.planning_dimanche
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE INDEX ON public.planning_dimanche (date_dimanche);
CREATE INDEX ON public.planning_dimanche (departement, date_dimanche);

-- ── RLS ──────────────────────────────────────────────────────────
-- Lecture pour tous les authentifiés ; écriture ouverte aux
-- authentifiés (les membres doivent pouvoir permuter leur place),
-- comme pour planning_captation et planning_projection.

ALTER TABLE public.planning_dimanche ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planning_dimanche_select"
  ON public.planning_dimanche FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "planning_dimanche_insert"
  ON public.planning_dimanche FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "planning_dimanche_update"
  ON public.planning_dimanche FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "planning_dimanche_delete"
  ON public.planning_dimanche FOR DELETE
  TO authenticated
  USING (true);
