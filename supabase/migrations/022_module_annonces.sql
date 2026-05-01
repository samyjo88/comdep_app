-- ============================================================
--  022 — Module Annonces
--  Tables : cultes · annonces · rubriques_annonce
--           historique_generations
--  RLS   : toutes tables → authenticated full-access
--  Trigger: updated_at sur annonces
-- ============================================================

-- ── 1. cultes ────────────────────────────────────────────────────────────

CREATE TABLE public.cultes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date_culte  date        NOT NULL UNIQUE,
  theme       text,
  predicateur text,
  statut      text        NOT NULL DEFAULT 'a_venir'
                          CHECK (statut IN ('a_venir', 'passe')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.cultes              IS 'Référentiel des cultes hebdomadaires';
COMMENT ON COLUMN public.cultes.statut       IS 'a_venir | passe';

-- ── 2. annonces ──────────────────────────────────────────────────────────

CREATE TABLE public.annonces (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  culte_id       uuid        NOT NULL
                             REFERENCES public.cultes (id) ON DELETE CASCADE,
  statut_global  text        NOT NULL DEFAULT 'brouillon'
                             CHECK (statut_global IN ('brouillon', 'valide', 'publie')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.annonces               IS 'Une fiche d''annonces par culte';
COMMENT ON COLUMN public.annonces.statut_global IS 'brouillon | valide | publie';

-- Contrainte : un seul document d'annonces par culte
CREATE UNIQUE INDEX annonces_culte_id_unique ON public.annonces (culte_id);

-- ── 3. rubriques_annonce ─────────────────────────────────────────────────

CREATE TABLE public.rubriques_annonce (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  annonce_id      uuid        NOT NULL
                              REFERENCES public.annonces (id) ON DELETE CASCADE,
  code_rubrique   text        NOT NULL
                              CHECK (code_rubrique IN (
                                'salutation',
                                'culte_precedent',
                                'culte_jour',
                                'conference',
                                'district',
                                'circuit',
                                'eglise_local'
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
COMMENT ON COLUMN public.rubriques_annonce.code_rubrique  IS 'salutation | culte_precedent | culte_jour | conference | district | circuit | eglise_local';
COMMENT ON COLUMN public.rubriques_annonce.donnees_brutes IS 'Saisie brute de l''utilisateur (input IA)';
COMMENT ON COLUMN public.rubriques_annonce.texte_genere   IS 'Texte produit par l''IA';
COMMENT ON COLUMN public.rubriques_annonce.texte_final    IS 'Version éditée et validée';
COMMENT ON COLUMN public.rubriques_annonce.reconduire     IS 'oui | non | modifier | a_definir';

-- Contrainte : une seule rubrique de chaque type par annonce
CREATE UNIQUE INDEX rubriques_annonce_id_code_unique
  ON public.rubriques_annonce (annonce_id, code_rubrique);

-- ── 4. historique_generations ────────────────────────────────────────────

CREATE TABLE public.historique_generations (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rubrique_id    uuid
                 REFERENCES public.rubriques_annonce (id) ON DELETE SET NULL,
  prompt_envoye  text,
  texte_recu     text,
  tokens_utilises integer,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.historique_generations IS 'Journal de chaque appel à l''IA (audit / debug)';

-- ── Index utiles ─────────────────────────────────────────────────────────

CREATE INDEX cultes_date_culte_idx            ON public.cultes              (date_culte DESC);
CREATE INDEX cultes_statut_idx                ON public.cultes              (statut);
CREATE INDEX annonces_culte_id_idx            ON public.annonces            (culte_id);
CREATE INDEX annonces_statut_global_idx       ON public.annonces            (statut_global);
CREATE INDEX rubriques_annonce_annonce_id_idx ON public.rubriques_annonce   (annonce_id);
CREATE INDEX rubriques_annonce_valide_idx     ON public.rubriques_annonce   (valide);
CREATE INDEX historique_rubrique_id_idx       ON public.historique_generations (rubrique_id);

-- ── Trigger : updated_at sur annonces ────────────────────────────────────

-- Fonction générique (réutilisable par d'autres tables)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER annonces_set_updated_at
  BEFORE UPDATE ON public.annonces
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.cultes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annonces                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubriques_annonce       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historique_generations  ENABLE ROW LEVEL SECURITY;

-- cultes : accès complet pour les utilisateurs authentifiés
CREATE POLICY "cultes_authenticated_all"
  ON public.cultes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- annonces : accès complet pour les utilisateurs authentifiés
CREATE POLICY "annonces_authenticated_all"
  ON public.annonces
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- rubriques_annonce : accès complet pour les utilisateurs authentifiés
CREATE POLICY "rubriques_annonce_authenticated_all"
  ON public.rubriques_annonce
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- historique_generations : accès complet pour les utilisateurs authentifiés
CREATE POLICY "historique_generations_authenticated_all"
  ON public.historique_generations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── Données de test (optionnel — retirer en production) ──────────────────
-- Décommenter pour pré-remplir un culte de test :
--
-- INSERT INTO public.cultes (date_culte, theme, predicateur, statut)
-- VALUES ('2026-05-03', 'La grâce de Dieu', 'Pasteur Martin', 'a_venir');
