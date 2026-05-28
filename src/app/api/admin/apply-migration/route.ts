/**
 * POST /api/admin/apply-migration
 *
 * Applique la migration 018 (date_envoi_reparation, description_reparation)
 * sur la table materiel_sono via l'API REST de Supabase.
 *
 * Sécurisé par SUPABASE_SERVICE_ROLE_KEY — ne jamais exposer côté client.
 * À appeler une seule fois après déploiement si la migration n'a pas été
 * appliquée via le CLI Supabase.
 */
import { NextRequest, NextResponse } from 'next/server'

const MIGRATION_018_SQL = `
ALTER TABLE public.materiel_sono
  ADD COLUMN IF NOT EXISTS description_reparation text,
  ADD COLUMN IF NOT EXISTS date_envoi_reparation   date;
`

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json(
      { error: 'Variables NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes' },
      { status: 500 }
    )
  }

  // Vérification basique : le header X-Admin-Secret doit correspondre à
  // SUPABASE_SERVICE_ROLE_KEY pour éviter les appels non autorisés.
  const adminSecret = req.headers.get('x-admin-secret')
  if (adminSecret !== key) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Appel à l'API REST Supabase pour exécuter le SQL via la fonction pg_net
  // ou via l'endpoint SQL du dashboard Supabase.
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ sql: MIGRATION_018_SQL }),
  })

  if (!res.ok) {
    // Si la fonction exec_sql n'existe pas, on guide l'utilisateur
    const body = await res.text()
    return NextResponse.json(
      {
        error: 'Impossible d\'exécuter via RPC. Veuillez appliquer manuellement via le SQL Editor Supabase.',
        detail: body,
        sql: MIGRATION_018_SQL.trim(),
      },
      { status: 422 }
    )
  }

  return NextResponse.json({ success: true, message: 'Migration 018 appliquée avec succès.' })
}
