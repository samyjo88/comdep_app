-- =============================================================
-- Migration 025 : Module Community Management
-- =============================================================
-- Prérequis : la table "cultes" existe déjà.

-- -------------------------------------------------------------
-- 1. membres_cm
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membres_cm (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nom         text        NOT NULL,
    prenom      text        NOT NULL,
    telephone   text,
    email       text,
    specialites text[]      DEFAULT '{}',   -- ex: {'redaction','design','video','photo'}
    plateformes text[]      DEFAULT '{}',   -- ex: {'facebook','instagram','whatsapp'}
    actif       boolean     NOT NULL DEFAULT true,
    notes       text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- 2. planning_cm
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planning_cm (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    semaine_debut date        NOT NULL UNIQUE,  -- lundi de la semaine
    membre_id     uuid        REFERENCES membres_cm(id),
    statut        text        NOT NULL DEFAULT 'planifie'
                              CHECK (statut IN ('planifie', 'confirme', 'termine')),
    notes         text,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- 3. posts
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
    id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    semaine_planning_id      uuid        REFERENCES planning_cm(id) ON DELETE CASCADE,
    culte_id                 uuid        REFERENCES cultes(id),
    plateforme               text        NOT NULL
                                         CHECK (plateforme IN ('facebook','instagram','whatsapp','youtube','twitter','tiktok')),
    type_contenu             text        NOT NULL
                                         CHECK (type_contenu IN ('photo','video','reel','story','texte','annonce','citation','evenement')),
    titre                    text,
    description              text,
    lien_media               text,
    date_publication_prevue  timestamptz,
    date_publication_reelle  timestamptz,
    statut                   text        NOT NULL DEFAULT 'a_faire'
                                         CHECK (statut IN ('a_faire','en_creation','en_attente_validation','programme','publie','annule')),
    assignee_id              uuid        REFERENCES membres_cm(id),
    url_post_publie          text,
    nb_likes                 integer,
    nb_commentaires          integer,
    nb_partages              integer,
    nb_vues                  integer,
    notes                    text,
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Trigger updated_at sur posts
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------------
-- 4. rapports_cm
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rapports_cm (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    semaine_debut date        NOT NULL UNIQUE,
    contenu_json  jsonb,
    resume_texte  text,
    genere_le     timestamptz,
    genere_par    uuid        REFERENCES auth.users(id),
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- 5. idees_contenu
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS idees_contenu (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    titre         text        NOT NULL,
    description   text,
    plateforme    text[]      DEFAULT '{}',
    type_contenu  text,
    priorite      text        NOT NULL DEFAULT 'normale'
                              CHECK (priorite IN ('urgente','haute','normale','basse')),
    statut        text        NOT NULL DEFAULT 'idee'
                              CHECK (statut IN ('idee','approuvee','utilisee')),
    proposee_par  uuid        REFERENCES auth.users(id),
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- RLS
-- =============================================================

ALTER TABLE membres_cm    ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_cm   ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapports_cm   ENABLE ROW LEVEL SECURITY;
ALTER TABLE idees_contenu ENABLE ROW LEVEL SECURITY;

-- membres_cm
CREATE POLICY "membres_cm_authenticated_all"
    ON membres_cm FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- planning_cm
CREATE POLICY "planning_cm_authenticated_all"
    ON planning_cm FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- posts
CREATE POLICY "posts_authenticated_all"
    ON posts FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- rapports_cm
CREATE POLICY "rapports_cm_authenticated_all"
    ON rapports_cm FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- idees_contenu
CREATE POLICY "idees_contenu_authenticated_all"
    ON idees_contenu FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
