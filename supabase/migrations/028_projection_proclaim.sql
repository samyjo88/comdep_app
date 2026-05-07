-- ============================================================
--  028 — Module Projection / Proclaim  (idempotent)
--  Tables : cantiques · setlists · setlist_items
--           membres_projection · planning_projection
--  Prérequis : table public.cultes (créée dans 022_module_annonces.sql)
-- ============================================================

-- ── 1. cantiques ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cantiques (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie           text        NOT NULL
                                  CHECK (categorie IN ('gad', 'chorale')),
  numero_gad          text,
  titre               text        NOT NULL,
  sous_titre          text,
  auteur_compositeur  text,
  tonalite            text,
  tempo               text,
  paroles             text,
  lien_partition      text,
  lien_audio          text,
  themes              text[]      NOT NULL DEFAULT '{}',
  moment_culte        text[]      NOT NULL DEFAULT '{}',
  difficulte          text,
  occasion            text[]      NOT NULL DEFAULT '{}',
  actif               boolean     NOT NULL DEFAULT true,
  nb_utilisations     integer     NOT NULL DEFAULT 0,
  derniere_utilisation date,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.cantiques                    IS 'Base unifiée des cantiques GAD et chorale';
COMMENT ON COLUMN public.cantiques.categorie          IS 'gad | chorale';
COMMENT ON COLUMN public.cantiques.numero_gad         IS 'Numéro dans le recueil GAD — renseigné uniquement pour categorie=gad';
COMMENT ON COLUMN public.cantiques.tempo              IS 'lent | moderato | vif — surtout pour GAD';
COMMENT ON COLUMN public.cantiques.difficulte         IS 'facile | moyen | difficile — surtout pour chorale';
COMMENT ON COLUMN public.cantiques.moment_culte       IS 'adoration | louange | offertoire | communion | envoi | special';
COMMENT ON COLUMN public.cantiques.occasion           IS 'culte_ordinaire | communion | bapteme | mariage | noel | paques';

CREATE INDEX IF NOT EXISTS idx_cantiques_categorie
  ON public.cantiques (categorie);

CREATE INDEX IF NOT EXISTS idx_cantiques_numero_gad
  ON public.cantiques (numero_gad);

CREATE INDEX IF NOT EXISTS idx_cantiques_titre_fts
  ON public.cantiques USING gin (to_tsvector('french', titre));

CREATE OR REPLACE TRIGGER cantiques_updated_at
  BEFORE UPDATE ON public.cantiques
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ── 2. setlists ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.setlists (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  culte_id       uuid        NOT NULL UNIQUE
                             REFERENCES public.cultes (id) ON DELETE CASCADE,
  titre_setlist  text,
  notes          text,
  statut         text        NOT NULL DEFAULT 'brouillon'
                             CHECK (statut IN ('brouillon', 'valide', 'utilise')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.setlists        IS 'Liste de cantiques associée à un culte';
COMMENT ON COLUMN public.setlists.statut IS 'brouillon | valide | utilise';

CREATE OR REPLACE TRIGGER setlists_updated_at
  BEFORE UPDATE ON public.setlists
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ── 3. setlist_items ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.setlist_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id        uuid        NOT NULL REFERENCES public.setlists (id) ON DELETE CASCADE,
  cantique_id       uuid        NOT NULL REFERENCES public.cantiques (id),
  position          integer     NOT NULL,
  moment_culte      text,
  tonalite_utilisee text,
  notes_operateur   text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT setlist_items_setlist_position_unique UNIQUE (setlist_id, position)
);

COMMENT ON TABLE  public.setlist_items                    IS 'Un cantique positionné dans une setlist';
COMMENT ON COLUMN public.setlist_items.position           IS 'Ordre dans la setlist (1, 2, 3…)';
COMMENT ON COLUMN public.setlist_items.tonalite_utilisee  IS 'Tonalité retenue pour ce culte — peut différer de la référence';
COMMENT ON COLUMN public.setlist_items.notes_operateur    IS 'Instructions spécifiques pour l''opérateur Proclaim';

-- ── 4. membres_projection ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.membres_projection (
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

COMMENT ON TABLE  public.membres_projection       IS 'Équipe de projection (diffusion et Proclaim)';
COMMENT ON COLUMN public.membres_projection.roles IS 'Valeurs possibles : operateur_diffusion, operateur_proclaim';

-- ── 5. planning_projection ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.planning_projection (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  culte_id      uuid        NOT NULL REFERENCES public.cultes (id) ON DELETE CASCADE,
  membre_id     uuid        NOT NULL REFERENCES public.membres_projection (id),
  role_du_jour  text        NOT NULL
                            CHECK (role_du_jour IN ('operateur_diffusion', 'operateur_proclaim')),
  statut        text        NOT NULL DEFAULT 'planifie'
                            CHECK (statut IN ('planifie', 'confirme', 'present', 'absent')),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planning_projection_culte_role_unique UNIQUE (culte_id, role_du_jour)
);

COMMENT ON TABLE  public.planning_projection              IS 'Affectation des opérateurs projection par culte';
COMMENT ON COLUMN public.planning_projection.role_du_jour IS 'operateur_diffusion | operateur_proclaim';
COMMENT ON COLUMN public.planning_projection.statut       IS 'planifie | confirme | present | absent';

-- ── 6. RLS ───────────────────────────────────────────────────

ALTER TABLE public.cantiques          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlists           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlist_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membres_projection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_projection ENABLE ROW LEVEL SECURITY;

-- cantiques
CREATE POLICY "cantiques_all_authenticated" ON public.cantiques
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- setlists
CREATE POLICY "setlists_all_authenticated" ON public.setlists
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- setlist_items
CREATE POLICY "setlist_items_all_authenticated" ON public.setlist_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- membres_projection
CREATE POLICY "membres_projection_all_authenticated" ON public.membres_projection
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- planning_projection
CREATE POLICY "planning_projection_all_authenticated" ON public.planning_projection
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
