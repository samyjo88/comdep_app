/**
 * GET /api/cron/son
 * Cron horaire — Module Sonorisation.
 *
 * Vérifications :
 *  1. Matériel en panne (hors_service) ou en réparation → alerte responsable
 *  2. Culte dans les 48h → rappel aux membres assignés
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  getSupabaseAdmin, verifyCronAuth, insertNotifications,
  dateToISO, formatDateFr,
  type NotifInput, type AnyRow,
} from '@/lib/cron-notifications'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  try {
    supabase = getSupabaseAdmin()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const now    = new Date()
  const in48h  = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const inputs: NotifInput[] = []

  // ── 1. Matériel hors service ou en réparation ──────────────────────────

  const { data: materiel, error: matErr } = await supabase
    .from('materiel_sono')
    .select('id, nom, marque, statut, en_reparation')
    .or('statut.eq.hors_service,en_reparation.eq.true')

  if (matErr) {
    return NextResponse.json({ error: matErr.message }, { status: 500 })
  }

  // Emails des responsables son actifs
  const { data: responsablesSon } = await supabase
    .from('membres_son')
    .select('email')
    .eq('role', 'responsable')
    .eq('actif', true)
  const emailsResponsables: string[] = (responsablesSon ?? [])
    .map((m: AnyRow) => m.email as string)
    .filter(Boolean)

  for (const mat of (materiel ?? []) as AnyRow[]) {
    const horsService = mat.statut === 'hors_service'
    const nomMat      = mat.marque ? `${mat.nom} (${mat.marque})` : String(mat.nom)

    inputs.push({
      emails:  emailsResponsables,
      module:  'son',
      titre:   horsService
        ? `🔴 Matériel hors service : ${mat.nom}`
        : `🔧 Matériel en réparation : ${mat.nom}`,
      message: horsService
        ? `${nomMat} est marqué hors service. Vérifiez l'inventaire avant le prochain culte.`
        : `${nomMat} est actuellement en cours de réparation.`,
      lien: '/sonorisation/materiel',
    })
  }

  // ── 2. Rappel 48h avant un culte planifié ─────────────────────────────

  const { data: cultesSon, error: cultesErr } = await supabase
    .from('planning_son')
    .select('id, date_culte, responsable_id, assistant1_id, assistant2_id')
    .gte('date_culte', dateToISO(now))
    .lte('date_culte', dateToISO(in48h))
    .neq('statut', 'passe')

  if (cultesErr) {
    return NextResponse.json({ error: cultesErr.message }, { status: 500 })
  }

  for (const culte of (cultesSon ?? []) as AnyRow[]) {
    const membreIds = [
      culte.responsable_id,
      culte.assistant1_id,
      culte.assistant2_id,
    ].filter(Boolean) as number[]

    if (membreIds.length === 0) continue

    const { data: membres } = await supabase
      .from('membres_son')
      .select('prenom, email')
      .in('id', membreIds)

    const emails: string[] = (membres ?? [])
      .map((m: AnyRow) => m.email as string)
      .filter(Boolean)

    const dateFr = formatDateFr(culte.date_culte as string)

    inputs.push({
      emails,
      module:  'son',
      titre:   `🔔 Rappel service son — ${dateFr}`,
      message: `Tu es assigné(e) pour assurer la sonorisation du culte du ${dateFr}. Prépare ton matériel.`,
      lien:    '/sonorisation/planning',
    })
  }

  // ── Insertion avec déduplication ───────────────────────────────────────

  const { inserted, skipped } = await insertNotifications(supabase, inputs)

  return NextResponse.json({
    success:  true,
    module:   'son',
    checks:   {
      materielEnAlerte: (materiel ?? []).length,
      cultesIn48h:      (cultesSon ?? []).length,
    },
    inserted,
    skipped,
  })
}
