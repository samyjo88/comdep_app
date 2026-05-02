-- ============================================================
--  023 — Résolution conflit table annonces + corrections FK
--
--  PROBLÈME : Migration 007 crée annonces.id AS bigint.
--  Migration 022 tente de créer rubriques_annonce.annonce_id uuid
--  REFERENCES annonces(id) → ÉCHEC (incompatibilité de types).
--
--  SOLUTION :
--    1. Si annonces.id = bigint (ancienne table) → renommer en
--       annonces_internes + annonces_internes_lectures.
--    2. Créer cultes, annonces (uuid), rubriques_annonce,
--       historique_generations si absents.
--    3. Corriger FK achats_planifies.created_by → public.profiles.
--
--  Idempotent : peut être exécuté plusieurs fois sans erreur.
-- ============================================================

-- ── Étape 1 : Détection et migration de l'ancienne table annonces ──

DO $$
DECLARE
  v_pk_type text;
BEGIN
  -- Récupérer le type de la PK de annonces (si la table existe)
  SELECT data_type INTO v_pk_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'annonces'
    AND column_name  = 'id';

  -- Si annonces.id est bigint → ancienne table, on la renomme
  IF v_pk_type = 'bigint' THEN

    RAISE NOTICE 'Migration 023: ancienne table annonces (bigint PK) détectée → renommage en annonces_internes';

    -- Supprimer les politiques RLS de l'ancienne table annonces
    DROP POLICY IF EXISTS "annonces_select"             ON public.annonces;
    DROP POLICY IF EXISTS "annonces_insert"             ON public.annonces;
    DROP POLICY IF EXISTS "annonces_update"             ON public.annonces;
    DROP POLICY IF EXISTS "annonces_delete"             ON public.annonces;
    DROP POLICY IF EXISTS "annonces_authenticated_all"  ON public.annonces;

    -- Renommer annonces → annonces_internes
    -- (Les FK des tables dépendantes sont mises à jour automatiquement)
    ALTER TABLE public.annonces RENAME TO annonces_internes;

    -- Renommer annonce_lectures → annonces_internes_lectures si elle existe
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'annonce_lectures'
    ) THEN
      -- Supprimer les politiques RLS de annonce_lectures
      DROP POLICY IF EXISTS "annonce_lectures_select" ON public.annonce_lectures;
      DROP POLICY IF EXISTS "annonce_lectures_insert" ON public.annonce_lectures;
      DROP POLICY IF EXISTS "annonce_lectures_delete" ON public.annonce_lectures;

      ALTER TABLE public.annonce_lectures RENAME TO annonces_internes_lectures;

      -- Recréer les politiques RLS sur la table renommée
      ALTER TABLE public.annonces_internes_lectures ENABLE ROW LEVEL SECURITY;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'annonces_internes_lectures_select'
          AND tablename  = 'annonces_internes_lectures'
      ) THEN
        CREATE POLICY "annonces_internes_lectures_select"
          ON public.annonces_internes_lectures FOR SELECT TO authenticated
          USING (user_id = auth.uid() OR public.has_role('admin'));
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'annonces_internes_lectures_insert'
          AND tablename  = 'annonces_internes_lectures'
      ) THEN
        CREATE POLICY "annonces_internes_lectures_insert"
          ON public.annonces_internes_lectures FOR INSERT TO authenticated
          WITH CHECK (user_id = auth.uid());
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'annonces_internes_lectures_delete'
          AND tablename  = 'annonces_internes_lectures'
      ) THEN
        CREATE POLICY "annonces_internes_lectures_delete"
          ON public.annonces_internes_lectures FOR DELETE TO authenticated
          USING (user_id = auth.uid());
      END IF;
    END IF;

    -- Recréer les politiques RLS sur annonces_internes
    ALTER TABLE public.annonces_internes ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE policyname = 'annonces_internes_select' AND tablename = 'annonces_internes'
    ) THEN
      CREATE POLICY "annonces_internes_select"
        ON public.annonces_internes FOR SELECT TO authenticated
        USING (
          (date_expiration IS NULL OR date_expiration > now())
          AND (
            equipe_id IS NULL
            OR auteur_id = auth.uid()
            OR public.has_role('admin')
            OR EXISTS (
              SELECT 1 FROM public.equipe_membres em
              WHERE em.equipe_id = annonces_internes.equipe_id
                AND em.user_id   = auth.uid()
            )
          )
        );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE policyname = 'annonces_internes_insert' AND tablename = 'annonces_internes'
    ) THEN
      CREATE POLICY "annonces_internes_insert"
        ON public.annonces_internes FOR INSERT TO authenticated
        WITH CHECK (
          auteur_id = auth.uid()
          AND (
            public.has_role('responsable')
            OR (
              equipe_id IS NOT NULL
              AND public.has_role('redacteur')
              AND EXISTS (
                SELECT 1 FROM public.equipe_membres em
                WHERE em.equipe_id = annonces_internes.equipe_id
                  AND em.user_id   = auth.uid()
              )
            )
          )
        );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE policyname = 'annonces_internes_update' AND tablename = 'annonces_internes'
    ) THEN
      CREATE POLICY "annonces_internes_update"
        ON public.annonces_internes FOR UPDATE TO authenticated
        USING (auteur_id = auth.uid() OR public.has_role('admin'));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE policyname = 'annonces_internes_delete' AND tablename = 'annonces_internes'
    ) THEN
      CREATE POLICY "annonces_internes_delete"
        ON public.annonces_internes FOR DELETE TO authenticated
        USING (auteur_id = auth.uid() OR public.has_role('admin'));
    END IF;

    RAISE NOTICE 'Migration 023: renommage annonces → annonces_internes terminé ✓';

  ELSIF v_pk_type IS NULL THEN
    RAISE NOTICE 'Migration 023: table annonces absente, création depuis zéro ✓';
  ELSE
    RAISE NOTICE 'Migration 023: annonces.id = % (uuid ou autre), pas de renommage nécessaire ✓', v_pk_type;
  END IF;
END $$;

-- ── Étape 2 : Table cultes ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cultes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date_culte  date        NOT NULL UNIQUE,
  theme       text,
  predicateur text,
  statut      text        NOT NULL DEFAULT 'a_venir'
                          CHECK (statut IN ('a_venir', 'passe')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.cultes        IS 'Référentiel des cultes hebdomadaires';
COMMENT ON COLUMN public.cultes.statut IS 'a_venir | passe';

-- ── Étape 3 : Table annonces (nouveau module, uuid PK) ────────

CREATE TABLE IF NOT EXISTS public.annonces (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  culte_id       uuid        NOT NULL REFERENCES public.cultes (id) ON DELETE CASCADE,
  statut_global  text        NOT NULL DEFAULT 'brouillon'
                             CHECK (statut_global IN ('brouillon', 'valide', 'publie')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.annonces               IS 'Une fiche d''annonces par culte';
COMMENT ON COLUMN public.annonces.statut_global IS 'brouillon | valide | publie';

-- Index unique culte_id : le nom peut déjà exister sur annonces_internes
-- après un renommage, donc on vérifie d'abord
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'annonces'
      AND indexname  = 'annonces_culte_id_unique'
  ) THEN
    -- Si l'index existe sur annonces_internes (ancienne table renommée), on
    -- crée un nouveau nom pour la nouvelle table
    IF EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'annonces_culte_id_unique'
    ) THEN
      CREATE UNIQUE INDEX annonces_module_culte_id_unique ON public.annonces (culte_id);
    ELSE
      CREATE UNIQUE INDEX annonces_culte_id_unique ON public.annonces (culte_id);
    END IF;
  END IF;
END $$;

-- ── Étape 4 : Table rubriques_annonce ─────────────────────────

CREATE TABLE IF NOT EXISTS public.rubriques_annonce (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  annonce_id      uuid        NOT NULL REFERENCES public.annonces (id) ON DELETE CASCADE,
  code_rubrique   text        NOT NULL
                              CHECK (code_rubrique IN (
                                'salutation', 'culte_precedent', 'culte_jour',
                                'conference', 'district', 'circuit', 'eglise_local'
                              )),
  ordre           integer     CHECK (ordre BETWEEN 1 AND 7),
  donnees_brutes  text,
  texte_genere    text,
  texte_final     text,
  reconduire      text        NOT NULL DEFAULT 'a_definir'
                              CHECK (reconduire IN ('oui', 'non', 'modifier', 'a_definir')),
  date_validite   date,
  genere_le       timestamptz,
  valide          boolean     NOT NULL DEFAULT false
);

COMMENT ON TABLE  public.rubriques_annonce                IS 'Une ligne par rubrique, par culte';
COMMENT ON COLUMN public.rubriques_annonce.donnees_brutes IS 'Saisie brute (input IA)';
COMMENT ON COLUMN public.rubriques_annonce.texte_genere   IS 'Texte produit par l''IA';
COMMENT ON COLUMN public.rubriques_annonce.texte_final    IS 'Version éditée et validée';
COMMENT ON COLUMN public.rubriques_annonce.reconduire     IS 'oui | non | modifier | a_definir';

CREATE UNIQUE INDEX IF NOT EXISTS rubriques_annonce_id_code_unique
  ON public.rubriques_annonce (annonce_id, code_rubrique);

-- ── Étape 5 : Table historique_generations ────────────────────

CREATE TABLE IF NOT EXISTS public.historique_generations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rubrique_id     uuid        REFERENCES public.rubriques_annonce (id) ON DELETE SET NULL,
  prompt_envoye   text,
  texte_recu      text,
  tokens_utilises integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.historique_generations IS 'Journal de chaque appel à l''IA (audit / debug)';

-- ── Étape 6 : Index de performance ───────────────────────────

CREATE INDEX IF NOT EXISTS cultes_date_culte_idx
  ON public.cultes (date_culte DESC);
CREATE INDEX IF NOT EXISTS cultes_statut_idx
  ON public.cultes (statut);
CREATE INDEX IF NOT EXISTS annonces_culte_id_idx
  ON public.annonces (culte_id);
CREATE INDEX IF NOT EXISTS annonces_statut_global_idx
  ON public.annonces (statut_global);
CREATE INDEX IF NOT EXISTS rubriques_annonce_annonce_id_idx
  ON public.rubriques_annonce (annonce_id);
CREATE INDEX IF NOT EXISTS rubriques_annonce_valide_idx
  ON public.rubriques_annonce (valide);
CREATE INDEX IF NOT EXISTS historique_rubrique_id_idx
  ON public.historique_generations (rubrique_id);

-- ── Étape 7 : Trigger updated_at pour annonces ───────────────

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

-- ── Étape 8 : RLS pour les nouvelles tables ───────────────────

ALTER TABLE public.cultes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annonces               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubriques_annonce      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historique_generations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'cultes_authenticated_all' AND tablename = 'cultes'
  ) THEN
    CREATE POLICY "cultes_authenticated_all"
      ON public.cultes FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'annonces_authenticated_all' AND tablename = 'annonces'
  ) THEN
    CREATE POLICY "annonces_authenticated_all"
      ON public.annonces FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'rubriques_annonce_authenticated_all' AND tablename = 'rubriques_annonce'
  ) THEN
    CREATE POLICY "rubriques_annonce_authenticated_all"
      ON public.rubriques_annonce FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'historique_generations_authenticated_all' AND tablename = 'historique_generations'
  ) THEN
    CREATE POLICY "historique_generations_authenticated_all"
      ON public.historique_generations FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Étape 9 : Corriger FK achats_planifies.created_by ─────────
-- La migration 019 référençait auth.users(id) au lieu de public.profiles(id).
-- Les IDs sont identiques, c'est une correction de cohérence.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'achats_planifies'
  ) THEN
    -- Supprimer l'ancienne FK si elle pointe vers auth.users
    IF EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type  = 'FOREIGN KEY'
        AND tc.table_schema     = 'public'
        AND tc.table_name       = 'achats_planifies'
        AND kcu.column_name     = 'created_by'
        AND ccu.table_schema    = 'auth'
        AND ccu.table_name      = 'users'
    ) THEN
      ALTER TABLE public.achats_planifies
        DROP CONSTRAINT IF EXISTS achats_planifies_created_by_fkey;
      ALTER TABLE public.achats_planifies
        ADD CONSTRAINT achats_planifies_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
      RAISE NOTICE 'Migration 023: FK achats_planifies.created_by corrigée → public.profiles ✓';
    ELSE
      RAISE NOTICE 'Migration 023: FK achats_planifies.created_by déjà correcte ✓';
    END IF;
  END IF;
END $$;
