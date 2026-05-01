-- ============================================================
--  022 — Module Annonces  (idempotent)
--  Tables : cultes · annonces · rubriques_annonce
--           historique_generations
-- ============================================================

-- ── 1. cultes ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cultes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date_culte  date        NOT NULL UNIQUE,
  theme       text,
  predicateur text,
  statut      text        NOT NULL DEFAULT 'a_venir'
                          CHECK (statut IN ('a_venir', 'passe')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cultes ADD COLUMN IF NOT EXISTS date_culte  date        UNIQUE;
ALTER TABLE public.cultes ADD COLUMN IF NOT EXISTS theme       text;
ALTER TABLE public.cultes ADD COLUMN IF NOT EXISTS predicateur text;
ALTER TABLE public.cultes ADD COLUMN IF NOT EXISTS statut      text        NOT NULL DEFAULT 'a_venir';
ALTER TABLE public.cultes ADD COLUMN IF NOT EXISTS created_at  timestamptz NOT NULL DEFAULT now();

COMMENT ON TABLE  public.cultes        IS 'Référentiel des cultes hebdomadaires';
COMMENT ON COLUMN public.cultes.statut IS 'a_venir | passe';

-- ── 2. annonces ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.annonces (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  culte_id       uuid        NOT NULL REFERENCES public.cultes (id) ON DELETE CASCADE,
  statut_global  text        NOT NULL DEFAULT 'brouillon'
                             CHECK (statut_global IN ('brouillon', 'valide', 'publie')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.annonces ADD COLUMN IF NOT EXISTS culte_id      uuid        REFERENCES public.cultes (id) ON DELETE CASCADE;
ALTER TABLE public.annonces ADD COLUMN IF NOT EXISTS statut_global text        DEFAULT 'brouillon';
ALTER TABLE public.annonces ADD COLUMN IF NOT EXISTS created_at    timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.annonces ADD COLUMN IF NOT EXISTS updated_at    timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'annonces_statut_global_check'
      AND conrelid = 'public.annonces'::regclass
  ) THEN
    ALTER TABLE public.annonces
      ADD CONSTRAINT annonces_statut_global_check
      CHECK (statut_global IN ('brouillon', 'valide', 'publie'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS annonces_culte_id_unique ON public.annonces (culte_id);

COMMENT ON TABLE  public.annonces               IS 'Une fiche d''annonces par culte';
COMMENT ON COLUMN public.annonces.statut_global IS 'brouillon | valide | publie';

-- ── 3. rubriques_annonce ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rubriques_annonce (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  annonce_id      uuid        NOT NULL REFERENCES public.annonces (id) ON DELETE CASCADE,
  code_rubrique   text        NOT NULL
                              CHECK (code_rubrique IN (
                                'salutation','culte_precedent','culte_jour',
                                'conference','district','circuit','eglise_local'
                              )),
  ordre           integer     CHECK (ordre BETWEEN 1 AND 7),
  donnees_brutes  text,
  texte_genere    text,
  texte_final     text,
  reconduire      text        NOT NULL DEFAULT 'a_definir'
                              CHECK (reconduire IN ('oui','non','modifier','a_definir')),
  date_validite   date,
  genere_le       timestamptz,
  valide          boolean     NOT NULL DEFAULT false
);

ALTER TABLE public.rubriques_annonce ADD COLUMN IF NOT EXISTS annonce_id     uuid        REFERENCES public.annonces (id) ON DELETE CASCADE;
ALTER TABLE public.rubriques_annonce ADD COLUMN IF NOT EXISTS code_rubrique  text;
ALTER TABLE public.rubriques_annonce ADD COLUMN IF NOT EXISTS ordre          integer;
ALTER TABLE public.rubriques_annonce ADD COLUMN IF NOT EXISTS donnees_brutes text;
ALTER TABLE public.rubriques_annonce ADD COLUMN IF NOT EXISTS texte_genere   text;
ALTER TABLE public.rubriques_annonce ADD COLUMN IF NOT EXISTS texte_final    text;
ALTER TABLE public.rubriques_annonce ADD COLUMN IF NOT EXISTS reconduire     text        DEFAULT 'a_definir';
ALTER TABLE public.rubriques_annonce ADD COLUMN IF NOT EXISTS date_validite  date;
ALTER TABLE public.rubriques_annonce ADD COLUMN IF NOT EXISTS genere_le      timestamptz;
ALTER TABLE public.rubriques_annonce ADD COLUMN IF NOT EXISTS valide         boolean     NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS rubriques_annonce_id_code_unique
  ON public.rubriques_annonce (annonce_id, code_rubrique);

COMMENT ON TABLE  public.rubriques_annonce                IS 'Une ligne par rubrique, par culte';
COMMENT ON COLUMN public.rubriques_annonce.donnees_brutes IS 'Saisie brute de l''utilisateur (input IA)';
COMMENT ON COLUMN public.rubriques_annonce.texte_genere   IS 'Texte produit par l''IA';
COMMENT ON COLUMN public.rubriques_annonce.texte_final    IS 'Version éditée et validée';
COMMENT ON COLUMN public.rubriques_annonce.reconduire     IS 'oui | non | modifier | a_definir';

-- ── 4. historique_generations ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.historique_generations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rubrique_id     uuid        REFERENCES public.rubriques_annonce (id) ON DELETE SET NULL,
  prompt_envoye   text,
  texte_recu      text,
  tokens_utilises integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.historique_generations ADD COLUMN IF NOT EXISTS rubrique_id     uuid    REFERENCES public.rubriques_annonce (id) ON DELETE SET NULL;
ALTER TABLE public.historique_generations ADD COLUMN IF NOT EXISTS prompt_envoye   text;
ALTER TABLE public.historique_generations ADD COLUMN IF NOT EXISTS texte_recu      text;
ALTER TABLE public.historique_generations ADD COLUMN IF NOT EXISTS tokens_utilises integer;
ALTER TABLE public.historique_generations ADD COLUMN IF NOT EXISTS created_at      timestamptz NOT NULL DEFAULT now();

COMMENT ON TABLE public.historique_generations IS 'Journal de chaque appel à l''IA (audit / debug)';

-- ── Index ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS cultes_date_culte_idx            ON public.cultes              (date_culte DESC);
CREATE INDEX IF NOT EXISTS cultes_statut_idx                ON public.cultes              (statut);
CREATE INDEX IF NOT EXISTS annonces_culte_id_idx            ON public.annonces            (culte_id);
CREATE INDEX IF NOT EXISTS annonces_statut_global_idx       ON public.annonces            (statut_global);
CREATE INDEX IF NOT EXISTS rubriques_annonce_annonce_id_idx ON public.rubriques_annonce   (annonce_id);
CREATE INDEX IF NOT EXISTS rubriques_annonce_valide_idx     ON public.rubriques_annonce   (valide);
CREATE INDEX IF NOT EXISTS historique_rubrique_id_idx       ON public.historique_generations (rubrique_id);

-- ── Trigger updated_at ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'annonces_set_updated_at'
      AND tgrelid = 'public.annonces'::regclass
  ) THEN
    CREATE TRIGGER annonces_set_updated_at
      BEFORE UPDATE ON public.annonces
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ── RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.cultes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annonces               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubriques_annonce      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historique_generations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cultes_authenticated_all' AND tablename = 'cultes') THEN
    CREATE POLICY "cultes_authenticated_all"
      ON public.cultes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'annonces_authenticated_all' AND tablename = 'annonces') THEN
    CREATE POLICY "annonces_authenticated_all"
      ON public.annonces FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'rubriques_annonce_authenticated_all' AND tablename = 'rubriques_annonce') THEN
    CREATE POLICY "rubriques_annonce_authenticated_all"
      ON public.rubriques_annonce FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'historique_generations_authenticated_all' AND tablename = 'historique_generations') THEN
    CREATE POLICY "historique_generations_authenticated_all"
      ON public.historique_generations FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
