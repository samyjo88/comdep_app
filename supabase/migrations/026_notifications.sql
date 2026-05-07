-- =============================================================
-- Migration 026 : Système de notifications centralisé
-- =============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module     text        NOT NULL
                           CHECK (module IN ('son', 'projection', 'annonces', 'captation', 'cm', 'general')),
    titre      text        NOT NULL,
    message    text        NOT NULL,
    lu         boolean     NOT NULL DEFAULT false,
    lien       text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes (liste par user + tri date)
CREATE INDEX IF NOT EXISTS notifications_user_created_idx
    ON notifications (user_id, created_at DESC);

-- Index partiel pour les non lues (count rapide)
CREATE INDEX IF NOT EXISTS notifications_user_non_lues_idx
    ON notifications (user_id)
    WHERE lu = false;

-- ── Row Level Security ────────────────────────────────────────────────────

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chaque utilisateur voit ses propres notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Chaque utilisateur peut marquer les siennes comme lues"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Les insertions se font via service role (API routes, server actions)
CREATE POLICY "Insertion via service role uniquement"
    ON notifications FOR INSERT
    WITH CHECK (false);

-- ── Realtime ──────────────────────────────────────────────────────────────
-- Permet aux clients de s'abonner aux INSERT/UPDATE en temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
