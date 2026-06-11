-- ============================================================
--  031 — Texte complet de l'annonce généré par l'IA
--  Colonne annonces.texte_genere : texte continu de l'annonce
--  dominicale, destiné à être lu à voix haute pendant le culte.
-- ============================================================

ALTER TABLE public.annonces ADD COLUMN IF NOT EXISTS texte_genere text;

COMMENT ON COLUMN public.annonces.texte_genere IS
  'Texte complet de l''annonce dominicale généré par l''IA (modifiable avant publication)';
