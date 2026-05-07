/**
 * GET /api/cron/annonces
 * Cron quotidien (08h00) — Module Annonces.
 *
 * 1. Archive les cultes dont la date est dépassée (a_venir → passe).
 * 2. Alerte si un culte est dans ≤ 3 jours et son annonce n'est pas validée.
 * 3. Rappel sur les rubriques marquées "modifier" depuis > 3 jours.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  getSupabaseAdmin, verifyCronAuth, insertNotifications,
  formatDateFr,
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

  const now     = new Date()
  const today   = now.toISOString().slice(0, 10)
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const since3d = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const inputs: NotifInput[] = []

  // ── 1. Archiver les cultes passés ────────────────────────────────────────

  const { data: archives } = await supabase
    .from('cultes')
    .update({ statut: 'passe' })
    .eq('statut', 'a_venir')
    .lt('date_culte', today)
    .select('id')

  const nbArchives = (archives ?? []).length

  // ── 2. Alertes cultes à venir non validés dans ≤ 3 jours ────────────────

  const { data: cultesUrgents } = await supabase
    .from('cultes')
    .select(`
      id, date_culte,
      annonces(id, statut_global,
        rubriques_annonce(id, valide)
      )
    `)
    .eq('statut', 'a_venir')
    .gte('date_culte', today)
    .lte('date_culte', in3days)

  let alertesUrgentes = 0

  for (const culte of (cultesUrgents ?? []) as AnyRow[]) {
    const annonce      = (culte.annonces ?? [])[0] as AnyRow | undefined
    const statutGlobal = annonce?.statut_global ?? 'aucune'

    if (statutGlobal === 'valide' || statutGlobal === 'publie') continue

    const dateFr    = formatDateFr(culte.date_culte as string)
    const joursAvant = Math.round(
      (new Date(culte.date_culte + 'T00:00:00').getTime() - new Date(today).getTime()) / 86400000
    )

    const rubriques    = (annonce?.rubriques_annonce ?? []) as AnyRow[]
    const nbValidees   = rubriques.filter((r: AnyRow) => r.valide).length
    const nbTotal      = rubriques.length || 7
    const detailStatut =
      statutGlobal === 'aucune'   ? 'Aucune annonce créée'               :
      statutGlobal === 'brouillon' ? `${nbValidees}/${nbTotal} rubriques complétées` :
      ''

    inputs.push({
      emails:  [],
      module:  'annonces',
      titre:   joursAvant === 0
        ? `🚨 Aujourd'hui ! Annonce non validée — ${dateFr}`
        : `⚠️ Dans ${joursAvant} jour${joursAvant > 1 ? 's' : ''} — Annonce non validée — ${dateFr}`,
      message: `Le culte du ${dateFr} approche et l'annonce n'est pas encore validée. ${detailStatut}`,
      lien:    '/annonces',
    })
    alertesUrgentes++
  }

  // ── 3. Rubriques "à modifier" depuis > 3 jours ───────────────────────────

  const { data: annonces, error: annoncesErr } = await supabase
    .from('annonces')
    .select(`
      id,
      updated_at,
      culte_id,
      cultes!inner(id, date_culte, statut),
      rubriques_annonce(id, titre, reconduire)
    `)
    .eq('cultes.statut', 'a_venir')
    .lte('updated_at', since3d)

  if (annoncesErr) {
    return NextResponse.json({ error: annoncesErr.message }, { status: 500 })
  }

  let alertesRetard = 0

  for (const annonce of (annonces ?? []) as AnyRow[]) {
    const rubriquesAModifier = ((annonce.rubriques_annonce ?? []) as AnyRow[])
      .filter((r: AnyRow) => r.reconduire === 'modifier')

    if (rubriquesAModifier.length === 0) continue

    const culte    = annonce.cultes as AnyRow
    const dateFr   = formatDateFr(culte.date_culte as string)
    const nbRub    = rubriquesAModifier.length
    const titresRub = rubriquesAModifier
      .slice(0, 3)
      .map((r: AnyRow) => r.titre as string)
      .join(', ')
    const suite    = nbRub > 3 ? ` (+${nbRub - 3} autre${nbRub - 3 > 1 ? 's' : ''})` : ''

    inputs.push({
      emails:  [],
      module:  'annonces',
      titre:   `📢 Rubriques à mettre à jour — ${dateFr}`,
      message: `${nbRub} rubrique${nbRub > 1 ? 's' : ''} marquée${nbRub > 1 ? 's' : ''} "À modifier" depuis plus de 3 jours pour le culte du ${dateFr} : ${titresRub}${suite}.`,
      lien:    '/annonces',
    })
    alertesRetard++
  }

  const { inserted, skipped } = await insertNotifications(supabase, inputs)

  return NextResponse.json({
    success: true,
    module:  'annonces',
    checks: {
      cultesArchives:  nbArchives,
      alertesUrgentes,
      alertesEnRetard: alertesRetard,
    },
    inserted,
    skipped,
  })
}
