-- ============================================================
-- 028 - Vue agrégée des membres (toutes équipes confondues)
-- ============================================================
-- Déduplique par email pour éviter de compter la même personne
-- plusieurs fois si elle appartient à plusieurs modules.

CREATE OR REPLACE VIEW public.membres AS
SELECT
  row_number() OVER ()                AS id,
  prenom,
  nom,
  email,
  actif
FROM (
  SELECT DISTINCT ON (lower(coalesce(email, prenom || ' ' || nom)))
    prenom, nom, email, actif
  FROM (
    SELECT prenom, nom, email, actif FROM public.membres_son
    UNION ALL
    SELECT prenom, nom, email, actif FROM public.membres_captation
    UNION ALL
    SELECT prenom, nom, email, actif FROM public.membres_cm
  ) tous
  ORDER BY lower(coalesce(email, prenom || ' ' || nom)), actif DESC
) dedupliques;

-- Accès en lecture pour les utilisateurs authentifiés
GRANT SELECT ON public.membres TO authenticated;
