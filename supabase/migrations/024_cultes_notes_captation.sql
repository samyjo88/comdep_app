-- ============================================================
--  024 — Ajout colonne notes_captation sur cultes  (idempotent)
-- ============================================================

ALTER TABLE public.cultes
  ADD COLUMN IF NOT EXISTS notes_captation text;

COMMENT ON COLUMN public.cultes.notes_captation
  IS 'Notes libres de l''équipe captation sur ce culte';
