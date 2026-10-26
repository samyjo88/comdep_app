/**
 * GET /api/cron/son
 * Cron horaire — Module Sonorisation.
 *
 * Vérifications :
 *  1. Matériel en panne (hors_service) ou en réparation → alerte responsable
 *  2. Tout culte programmé (dimanche ou semaine) a sa ligne de planning son
 *  3. Culte dans les 3 jours sans responsable son → relance des responsables
 *  4. Culte dans les 48h → rappel aux membres assignés
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  getSupabaseAdmin, verifyCronAuth, insertNotifications,
  dateToISO, formatDateFr,
  type NotifInput, type AnyRow,
} from '@/lib/cron-notifications'
import { sendNotificationEmails } from '@/lib/resend'

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
    const titre = horsService
      ? `🔴 Matériel hors service : ${mat.nom}`
      : `🔧 Matériel en réparation : ${mat.nom}`
    const message = horsService
      ? `${nomMat} est marqué hors service. Vérifiez l'inventaire avant le prochain culte.`
      : `${nomMat} est actuellement en cours de réparation.`

    inputs.push({ emails: emailsResponsables, module: 'son', titre, message, lien: '/sonorisation/materiel' })

    // E-mail en complément de la notification in-app
    await sendNotificationEmails(emailsResponsables, titre, message, '/sonorisation/materiel')
  }

  // ── 2. Cultes programmés dans les autres modules → planning son ───────

  const in14j = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const { data: cultesAVenir } = await supabase
    .from('cultes')
    .select('*')
    .gte('date_culte', dateToISO(now))
    .lte('date_culte', dateToISO(in14j))
  const culteParDate = new Map<string, AnyRow>(
    ((cultesAVenir ?? []) as AnyRow[]).map(c => [c.date_culte as string, c]),
  )
  if (culteParDate.size > 0) {
    await supabase.from('planning_son').upsert(
      [...culteParDate.keys()].map(d => ({ date_culte: d, statut: 'planifie' })),
      { onConflict: 'date_culte', ignoreDuplicates: true },
    )
  }

  const quand = (date: string) => {
    const c = culteParDate.get(date)
    const h = c?.heure_debut ? ` à ${String(c.heure_debut).slice(0, 5).replace(':', 'h')}` : ''
    return `${formatDateFr(date)}${h}`
  }
  const lienCulte = (date: string) =>
    culteParDate.get(date) ? `/cultes/${culteParDate.get(date)!.id}` : '/sonorisation/planning'

  // ── 3. Relance : personne n'est désigné à la sono à J-3 ───────────────

  const in3j = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const { data: sansResponsable } = await supabase
    .from('planning_son')
    .select('date_culte')
    .gte('date_culte', dateToISO(now))
    .lte('date_culte', dateToISO(in3j))
    .is('responsable_id', null)
    .neq('statut', 'passe')

  for (const p of (sansResponsable ?? []) as AnyRow[]) {
    const date    = p.date_culte as string
    const titre   = `⚠️ Sono à désigner — ${quand(date)}`
    const message = `Aucun responsable son n'est encore désigné pour le culte du ${quand(date)}. Merci de désigner qui sera à la sono.`
    inputs.push({ emails: emailsResponsables, module: 'son', titre, message, lien: lienCulte(date) })
    await sendNotificationEmails(emailsResponsables, titre, message, lienCulte(date))
  }

  // ── 4. Rappel 48h avant un culte planifié ─────────────────────────────

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

    const dateFr  = quand(culte.date_culte as string)
    const lien    = lienCulte(culte.date_culte as string)
    const titre   = `🔔 Rappel service son — ${dateFr}`
    const message = `Tu es assigné(e) pour assurer la sonorisation du culte du ${dateFr}. Prépare ton matériel.`

    inputs.push({ emails, module: 'son', titre, message, lien })

    // E-mail en complément de la notification in-app
    await sendNotificationEmails(emails, titre, message, lien)
  }

  // ── Insertion avec déduplication ───────────────────────────────────────

  const { inserted, skipped } = await insertNotifications(supabase, inputs)

  return NextResponse.json({
    success:  true,
    module:   'son',
    checks:   {
      materielEnAlerte: (materiel ?? []).length,
      cultesIn48h:      (cultesSon ?? []).length,
      sonADesigner:     (sansResponsable ?? []).length,
    },
    inserted,
    skipped,
  })
}
