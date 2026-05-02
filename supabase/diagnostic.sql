-- ============================================================
--  DIAGNOSTIC — ComDept Église
--  Coller dans Supabase SQL Editor → Run
--  Donne l'état exact de la base de données
-- ============================================================

-- ── 1. Toutes les tables publiques ───────────────────────────
SELECT '=== TABLES ===' AS section, NULL AS info UNION ALL
SELECT table_name, NULL
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY 1;

-- ── 2. État du module Annonces (tables critiques) ────────────
SELECT
  '=== MODULE ANNONCES ===' AS check_name,
  NULL                      AS valeur
UNION ALL
SELECT
  'annonces.id type',
  (SELECT data_type
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'annonces' AND column_name = 'id')
UNION ALL
SELECT 'cultes existe',
  CASE WHEN EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='cultes')
       THEN 'OUI ✓' ELSE 'NON ✗' END
UNION ALL
SELECT 'rubriques_annonce existe',
  CASE WHEN EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='rubriques_annonce')
       THEN 'OUI ✓' ELSE 'NON ✗' END
UNION ALL
SELECT 'historique_generations existe',
  CASE WHEN EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='historique_generations')
       THEN 'OUI ✓' ELSE 'NON ✗' END
UNION ALL
SELECT 'annonces_internes existe',
  CASE WHEN EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='annonces_internes')
       THEN 'OUI (ancienne table renommée)' ELSE 'NON (pas encore renommée)' END;

-- ── 3. Module Sonorisation ────────────────────────────────────
SELECT
  '=== MODULE SONORISATION ===' AS check_name,
  NULL AS valeur
UNION ALL
SELECT 'materiel_sono existe',
  CASE WHEN EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='materiel_sono')
       THEN 'OUI ✓' ELSE 'NON ✗' END
UNION ALL
SELECT 'membres_son existe',
  CASE WHEN EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='membres_son')
       THEN 'OUI ✓' ELSE 'NON ✗' END
UNION ALL
SELECT 'planning_son existe',
  CASE WHEN EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='planning_son')
       THEN 'OUI ✓' ELSE 'NON ✗' END
UNION ALL
SELECT 'achats_planifies existe',
  CASE WHEN EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='achats_planifies')
       THEN 'OUI ✓' ELSE 'NON ✗' END;

-- ── 4. FK achats_planifies.created_by ────────────────────────
SELECT
  '=== FK achats_planifies ===' AS check_name,
  NULL AS valeur
UNION ALL
SELECT
  'created_by référence',
  ccu.table_schema || '.' || ccu.table_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'achats_planifies'
  AND kcu.column_name = 'created_by';

-- ── 5. Colonnes de annonces ───────────────────────────────────
SELECT '=== COLONNES annonces ===' AS column_name, NULL AS data_type, NULL AS is_nullable
UNION ALL
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'annonces'
ORDER BY 1;

-- ── 6. Politiques RLS actives ────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ── 7. Enums définis ─────────────────────────────────────────
SELECT t.typname AS enum_name,
       string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS valeurs
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;
