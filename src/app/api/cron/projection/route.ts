/**
 * GET /api/cron/projection
 * Cron horaire — Module Projection / Proclaim.
 *
 * Vérifications :
 *  1. Culte dans les 48h → rappel à l'équipe diffusion / Proclaim
 *  2. Setlist (cantiques) du prochain culte vide à J-2 → alerte
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

  const now   = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const inputs: NotifInput[] = []

  // Emails de l'équipe Projection depuis plannings_semaine (responsable_id → membres_son)
  // Fallback vers les admins si la table est vide ou le module non configuré.
  const { data: projPlanning } = await supabase
    .from('plannings_semaine')
    .select('responsable_id')
    .gte('date_culte', dateToISO(now))
    .order('date_culte', { ascending: true })
    .limit(1)
    .maybeSingle()

  let emailsProj: string[] = []
  if (projPlanning?.responsable_id) {
    const { data: membreProj } = await supabase
      .from('membres_son')
      .select('email')
      .eq('id', projPlanning.responsable_id)
      .maybeSingle()
    if (membreProj?.email) emailsProj = [membreProj.email as string]
  }

  // ── 1. Rappel 48h avant un culte ─────────────────────────────────────────

  const { data: cultes, error: cultesErr } = await supabase
    .from('cultes')
    .select('id, date_culte, theme')
    .eq('statut', 'a_venir')
    .gte('date_culte', dateToISO(now))
    .lte('date_culte', dateToISO(in48h))

  if (cultesErr) {
    return NextResponse.json({ error: cultesErr.message }, { status: 500 })
  }

  for (const culte of (cultes ?? []) as AnyRow[]) {
    const dateFr  = formatDateFr(culte.date_culte as string)
    const theme   = culte.theme ? ` — Thème : « ${culte.theme} »` : ''
    const titre   = `📽️ Rappel Projection — ${dateFr}`
    const message = `Le culte du ${dateFr} approche.${theme} Vérifiez que la présentation Proclaim est complète et à jour.`

    inputs.push({ emails: emailsProj, module: 'projection', titre, message, lien: '/projection' })

    // E-mail en complément de la notification in-app (uniquement si email résolu)
    if (emailsProj.length > 0) {
      await sendNotificationEmails(emailsProj, titre, message, '/projection')
    }
  }

  // ── 2. Setlist manquante à J-2 ────────────────────────────────────────────

  // Cherche le culte prévu exactement dans 48h (fenêtre ±1 jour pour crons décalés)
  const { data: culteJ2 } = await supabase
    .from('cultes')
    .select('id, date_culte')
    .eq('statut', 'a_venir')
    .gte('date_culte', dateToISO(now))
    .lte('date_culte', dateToISO(in48h))
    .order('date_culte', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (culteJ2) {
    // Vérifie si des cantiques existent pour ce culte
    const { data: cantiques, error: cantiquesErr } = await supabase
      .from('cantiques')
      .select('id')
      .eq('date_culte', culteJ2.date_culte)
      .limit(1)

    // Si la table cantiques renvoie une erreur (table inexistante) on ignore
    if (!cantiquesErr && (cantiques ?? []).length === 0) {
      const dateFr = formatDateFr(culteJ2.date_culte as string)
      inputs.push({
        emails:  emailsProj,
        module:  'projection',
        titre:   `⚠️ Setlist manquante — ${dateFr}`,
        message: `La liste des cantiques pour le culte du ${dateFr} n'a pas encore été saisie dans Proclaim. Il reste moins de 48h.`,
        lien:    '/projection',
      })
    }
  }

  // ── Insertion avec déduplication ───────────────────────────────────────────

  const { inserted, skipped } = await insertNotifications(supabase, inputs)

  return NextResponse.json({
    success:  true,
    module:   'projection',
    checks:   {
      cultesIn48h:      (cultes ?? []).length,
      setlistManquante: culteJ2 ? 1 : 0,
    },
    inserted,
    skipped,
  })
}
