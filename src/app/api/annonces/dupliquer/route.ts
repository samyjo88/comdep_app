import { createClient } from '@supabase/supabase-js'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'

export async function POST(request: Request) {
  const { unauthorized } = await requireAuth()
  if (unauthorized) return unauthorizedResponse()

  const body = await request.json().catch(() => ({}))
  const { annonce_id, date_culte } = body as { annonce_id?: string; date_culte?: string }

  if (!annonce_id || !date_culte) {
    return Response.json({ error: 'annonce_id et date_culte requis' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 1. Récupérer l'annonce source avec son culte et ses rubriques
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: source, error: e1 } = await (supabase as any)
    .from('annonces')
    .select('*, cultes(*), rubriques_annonce(*)')
    .eq('id', annonce_id)
    .single()

  if (e1 || !source) {
    return Response.json({ error: 'Annonce introuvable' }, { status: 404 })
  }

  // 2. Créer le nouveau culte (même thème / prédicateur, date et statut neufs)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newCulte, error: e2 } = await (supabase as any)
    .from('cultes')
    .insert({
      date_culte,
      theme:       source.cultes?.theme   ?? null,
      predicateur: source.cultes?.predicateur ?? null,
      statut:      'a_venir',
    })
    .select()
    .single()

  if (e2 || !newCulte) {
    return Response.json({ error: e2?.message ?? 'Erreur création culte' }, { status: 500 })
  }

  // 3. Créer la nouvelle annonce
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newAnnonce, error: e3 } = await (supabase as any)
    .from('annonces')
    .insert({ culte_id: newCulte.id, statut_global: 'brouillon' })
    .select()
    .single()

  if (e3 || !newAnnonce) {
    return Response.json({ error: e3?.message ?? 'Erreur création annonce' }, { status: 500 })
  }

  // 4. Copier les rubriques (données pré-remplies, textes et statuts réinitialisés)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rubriquesPayload = (source.rubriques_annonce as any[]).map((r) => ({
    annonce_id:     newAnnonce.id,
    code_rubrique:  r.code_rubrique,
    ordre:          r.ordre,
    donnees_brutes: r.donnees_brutes,  // données du formulaire conservées
    texte_genere:   null,
    texte_final:    null,
    reconduire:     'a_definir',
    date_validite:  null,
    genere_le:      null,
    valide:         false,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: e4 } = await (supabase as any)
    .from('rubriques_annonce')
    .insert(rubriquesPayload)

  if (e4) {
    return Response.json({ error: e4.message }, { status: 500 })
  }

  return Response.json({ id: newAnnonce.id as string })
}
