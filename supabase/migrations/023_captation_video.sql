-- ============================================================
--  Module : Captation Vidéo
--  Tables : membres_captation · planning_captation
--           dossiers_drive · livraisons_captation
--  Prérequis : table public.cultes (créée dans 022_module_annonces.sql)
-- ============================================================

-- ── 1. membres_captation ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.membres_captation (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         text        NOT NULL,
  prenom      text        NOT NULL,
  telephone   text,
  email       text,
  roles       text[]      NOT NULL DEFAULT '{}',
  actif       boolean     NOT NULL DEFAULT true,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.membres_captation       IS 'Équipe de captation (cameramen, photographes, infographistes)';
COMMENT ON COLUMN public.membres_captation.roles IS 'Valeurs possibles : cameraman, photographe, infographiste';

-- ── 2. planning_captation ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.planning_captation (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  culte_id     uuid        NOT NULL REFERENCES public.cultes (id) ON DELETE CASCADE,
  membre_id    uuid        NOT NULL REFERENCES public.membres_captation (id),
  role_du_jour text        NOT NULL,
  statut       text        NOT NULL DEFAULT 'planifie',
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planning_captation_culte_role_unique UNIQUE (culte_id, role_du_jour)
);

COMMENT ON TABLE  public.planning_captation              IS 'Assignation des membres de captation par culte';
COMMENT ON COLUMN public.planning_captation.role_du_jour IS 'cameraman | photographe | infographiste';
COMMENT ON COLUMN public.planning_captation.statut       IS 'planifie | confirme | present | absent';

-- ── 3. dossiers_drive ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dossiers_drive (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  culte_id                uuid        NOT NULL UNIQUE REFERENCES public.cultes (id) ON DELETE CASCADE,
  lien_dossier_principal  text,
  lien_videos             text,
  lien_photos             text,
  lien_infographie        text,
  id_dossier_drive        text,
  espace_utilise_mb       integer,
  nb_fichiers             integer,
  derniere_synchro        timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.dossiers_drive                     IS 'Liens Google Drive associés à chaque culte';
COMMENT ON COLUMN public.dossiers_drive.id_dossier_drive    IS 'ID Google Drive pour usage via l''API (ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs)';

-- ── 4. livraisons_captation ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.livraisons_captation (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  culte_id       uuid        NOT NULL REFERENCES public.cultes (id) ON DELETE CASCADE,
  type_livrable  text        NOT NULL,
  nom_fichier    text,
  lien_drive     text,
  statut         text        NOT NULL DEFAULT 'a_faire',
  assignee_id    uuid        REFERENCES public.membres_captation (id),
  date_limite    date,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.livraisons_captation              IS 'Suivi des livrables de captation par culte';
COMMENT ON COLUMN public.livraisons_captation.type_livrable IS 'video_brute | video_montee | photos_selectionnees | visuel_reseaux | autre';
COMMENT ON COLUMN public.livraisons_captation.statut        IS 'a_faire | en_cours | livre | valide';

-- ── 5. Index ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS membres_captation_actif_idx         ON public.membres_captation    (actif);
CREATE INDEX IF NOT EXISTS planning_captation_culte_idx        ON public.planning_captation   (culte_id);
CREATE INDEX IF NOT EXISTS planning_captation_membre_idx       ON public.planning_captation   (membre_id);
CREATE INDEX IF NOT EXISTS planning_captation_statut_idx       ON public.planning_captation   (statut);
CREATE INDEX IF NOT EXISTS dossiers_drive_culte_idx            ON public.dossiers_drive       (culte_id);
CREATE INDEX IF NOT EXISTS livraisons_captation_culte_idx      ON public.livraisons_captation (culte_id);
CREATE INDEX IF NOT EXISTS livraisons_captation_statut_idx     ON public.livraisons_captation (statut);
CREATE INDEX IF NOT EXISTS livraisons_captation_assignee_idx   ON public.livraisons_captation (assignee_id);

-- ── 6. Row Level Security ────────────────────────────────────
ALTER TABLE public.membres_captation    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_captation   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossiers_drive       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livraisons_captation ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- membres_captation
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'membres_captation_authenticated_all'
      AND tablename  = 'membres_captation'
  ) THEN
    CREATE POLICY "membres_captation_authenticated_all"
      ON public.membres_captation FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;

  -- planning_captation
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'planning_captation_authenticated_all'
      AND tablename  = 'planning_captation'
  ) THEN
    CREATE POLICY "planning_captation_authenticated_all"
      ON public.planning_captation FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;

  -- dossiers_drive
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'dossiers_drive_authenticated_all'
      AND tablename  = 'dossiers_drive'
  ) THEN
    CREATE POLICY "dossiers_drive_authenticated_all"
      ON public.dossiers_drive FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;

  -- livraisons_captation
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'livraisons_captation_authenticated_all'
      AND tablename  = 'livraisons_captation'
  ) THEN
    CREATE POLICY "livraisons_captation_authenticated_all"
      ON public.livraisons_captation FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;
