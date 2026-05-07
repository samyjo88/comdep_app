/**
 * GET /api/cron/annonces
 * Cron horaire — Module Annonces.
 *
 * Vérification :
 *  Rubrique marquée "modifier" (reconduire='modifier') depuis plus de 3 jours
 *  sur un culte à venir → rappel aux responsables/admins.
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

  const now      = new Date()
  const since3d  = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const inputs: NotifInput[] = []

  // Annonces des cultes à venir avec rubriques "à modifier"
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

  let alertCount = 0

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
      emails:  [],   // pas d'équipe dédiée — fallback admins
      module:  'annonces',
      titre:   `📢 Rubriques à mettre à jour — ${dateFr}`,
      message: `${nbRub} rubrique${nbRub > 1 ? 's' : ''} marquée${nbRub > 1 ? 's' : ''} "À modifier" depuis plus de 3 jours pour le culte du ${dateFr} : ${titresRub}${suite}.`,
      lien:    '/annonces',
    })

    alertCount++
  }

  const { inserted, skipped } = await insertNotifications(supabase, inputs)

  return NextResponse.json({
    success:  true,
    module:   'annonces',
    checks:   {
      annoncesEnRetard: alertCount,
    },
    inserted,
    skipped,
  })
}
