import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createDossierCulte } from '@/lib/google-drive'

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

// ── POST /api/captation/drive/creer-dossier ────────────────────────────────

export async function POST(req: NextRequest) {
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
    return NextResponse.json(
      { error: `Erreur Google Drive : ${(e as Error).message}` },
      { status: 500 },
    )
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

  return NextResponse.json({
    success: true,
    dossier: saved,
    liens: dossier.liens,
  })
}
