import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createDossierCulte } from '@/lib/google-drive'

export const dynamic = 'force-dynamic'

// ── Auth session ───────────────────────────────────────────────────────────

async function verifierSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    return user !== null
  } catch {
    return false
  }
}

// ── Supabase admin ─────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || key === 'your-supabase-service-role-key') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY non configurée')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── Normalisation erreurs Drive ────────────────────────────────────────────

function driveErreur(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('invalid_grant') || msg.includes('token') || msg.includes('JWT')) {
    return 'Impossible de contacter Google Drive. Le token de service est expiré ou invalide — vérifiez GOOGLE_PRIVATE_KEY.'
  }
  if (msg.includes('quota') || msg.includes('429') || msg.includes('rateLimitExceeded')) {
    return 'Impossible de contacter Google Drive. Quota API dépassé — réessayez dans quelques minutes.'
  }
  if (msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('network')) {
    return 'Impossible de contacter Google Drive. Problème réseau — vérifiez la connectivité.'
  }
  if (msg.includes('permission') || msg.includes('403') || msg.includes('forbidden')) {
    return 'Impossible de contacter Google Drive. Permission refusée — partagez le dossier racine avec le compte de service.'
  }
  if (msg.includes('GOOGLE_SERVICE_ACCOUNT') || msg.includes('GOOGLE_PRIVATE_KEY') || msg.includes('non configurée')) {
    return 'Impossible de contacter Google Drive. Vérifiez la configuration (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_DRIVE_DOSSIER_RACINE_ID).'
  }
  return `Impossible de contacter Google Drive. ${msg}`
}

// ── POST /api/captation/drive/creer-dossier ────────────────────────────────

export async function POST(req: NextRequest) {
  // Vérification session
  if (!await verifierSession()) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  try {
    supabase = getSupabaseAdmin()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  let culteId: string
  try {
    const body = await req.json() as { culte_id?: string }
    if (!body.culte_id) {
      return NextResponse.json({ error: 'culte_id requis' }, { status: 400 })
    }
    culteId = body.culte_id
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  // 1. Récupérer la date du culte
  const { data: culte, error: culteErr } = await supabase
    .from('cultes')
    .select('id, date_culte')
    .eq('id', culteId)
    .single()

  if (culteErr || !culte) {
    return NextResponse.json({ error: 'Culte introuvable' }, { status: 404 })
  }

  // 2. Créer les dossiers Drive
  let dossier
  try {
    dossier = await createDossierCulte(culte.date_culte as string)
  } catch (e) {
    return NextResponse.json({ error: driveErreur(e) }, { status: 502 })
  }

  // 3. Persister dans dossiers_drive
  const { data: saved, error: saveErr } = await supabase
    .from('dossiers_drive')
    .upsert(
      {
        culte_id:               culteId,
        id_dossier_drive:       dossier.idDossierPrincipal,
        lien_dossier_principal: dossier.liens.principal,
        lien_videos:            dossier.liens.videos,
        lien_photos:            dossier.liens.photos,
        lien_infographie:       dossier.liens.infographie,
      },
      { onConflict: 'culte_id' },
    )
    .select()
    .single()

  if (saveErr) {
    return NextResponse.json(
      { error: `Drive créé mais erreur Supabase : ${saveErr.message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true, dossier: saved, liens: dossier.liens })
}
