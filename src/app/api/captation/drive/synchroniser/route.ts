import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getDossierInfo, calculerEspaceTotal } from '@/lib/google-drive'

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

// ── POST /api/captation/drive/synchroniser ─────────────────────────────────

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

  // 1. Récupérer l'entrée dossiers_drive
  const { data: dossierRow, error: rowErr } = await supabase
    .from('dossiers_drive')
    .select('id, id_dossier_drive')
    .eq('culte_id', culteId)
    .single()

  if (rowErr || !dossierRow) {
    return NextResponse.json(
      { error: 'Aucun dossier Drive associé à ce culte. Créez-le d\'abord.' },
      { status: 404 },
    )
  }

  const dossierDriveId = dossierRow.id_dossier_drive as string | null
  if (!dossierDriveId) {
    return NextResponse.json(
      { error: 'id_dossier_drive manquant dans l\'enregistrement.' },
      { status: 422 },
    )
  }

  // 2. Interroger Drive en parallèle
  let info: Awaited<ReturnType<typeof getDossierInfo>>
  let espaceMb: number
  try {
    ;[info, espaceMb] = await Promise.all([
      getDossierInfo(dossierDriveId),
      calculerEspaceTotal(dossierDriveId),
    ])
  } catch (e) {
    return NextResponse.json(
      { error: `Erreur Google Drive : ${(e as Error).message}` },
      { status: 500 },
    )
  }

  // 3. Mettre à jour Supabase
  const maintenant = new Date().toISOString()

  const { data: updated, error: updateErr } = await supabase
    .from('dossiers_drive')
    .update({
      nb_fichiers:       info.nbFichiers,
      espace_utilise_mb: espaceMb,
      derniere_synchro:  maintenant,
    })
    .eq('id', dossierRow.id)
    .select()
    .single()

  if (updateErr) {
    return NextResponse.json(
      { error: `Drive synchronisé mais erreur Supabase : ${updateErr.message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    stats: {
      nb_fichiers:       info.nbFichiers,
      espace_utilise_mb: espaceMb,
      derniere_synchro:  maintenant,
    },
    dossier: updated,
  })
}
