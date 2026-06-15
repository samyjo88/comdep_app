-- ============================================================
--  030 — Vue informations_actives
--  Informations de rubriques encore actives, pour le
--  pré-chargement des prochaines fiches d'annonces.
--
--  Une rubrique est « active » si elle est marquée à reconduire
--  (oui ou modifier) et que sa date de validité n'est pas dépassée.
--  Les rubriques externes (conférence / district / circuit) sont
--  catégorisées « externe », l'église locale « locale ».
-- ============================================================

CREATE OR REPLACE VIEW public.informations_actives
WITH (security_invoker = true) AS
SELECT
  r.id,
  r.code_rubrique                                    AS source,
  r.reconduire,
  r.date_validite                                    AS date_fin,
  r.donnees_brutes,
  r.texte_final,
  a.id                                               AS annonce_id,
  c.id                                               AS culte_id,
  c.date_culte,
  CASE
    WHEN r.code_rubrique IN ('conference', 'district', 'circuit') THEN 'externe'
    ELSE 'locale'
  END                                                AS categorie
FROM public.rubriques_annonce r
JOIN public.annonces a ON a.id = r.annonce_id
JOIN public.cultes   c ON c.id = a.culte_id
WHERE r.code_rubrique IN ('conference', 'district', 'circuit', 'eglise_local')
  AND r.reconduire IN ('oui', 'modifier')
  AND (r.date_validite IS NULL OR r.date_validite >= CURRENT_DATE);

COMMENT ON VIEW public.informations_actives IS
  'Rubriques d''informations (externes et locales) encore actives, à reconduire sur la prochaine fiche d''annonces';
