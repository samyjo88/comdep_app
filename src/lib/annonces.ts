import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { RUBRIQUES_CONFIG } from '@/types/annonces'
import type {
  Culte,
  Annonce,
  RubriqueAnnonce,
  AnnonceAvecRubriques,
  CulteAvecAnnonce,
  StatutReconduite,
  StatutAnnonce,
} from '@/types/annonces'

export type { Culte, Annonce, RubriqueAnnonce, AnnonceAvecRubriques, CulteAvecAnnonce }

export interface AnnonceAvecCulte extends Annonce {
  cultes:           Culte
  rubriques_annonce: RubriqueAnnonce[]
}

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

async function getDb() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) => {
          try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch { /* Server Component */ }
        },
      },
    }
  )
}

// ── archiverCultesPassés ───────────────────────────────────────────────────
// Passe en statut='passe' tous les cultes a_venir dont la date est dépassée.
// Retourne le nombre de cultes archivés.
export async function archiverCultesPassés(): Promise<number> {
  try {
    const db    = await getDb()
    const today = new Date().toISOString().slice(0, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from('cultes')
      .update({ statut: 'passe' })
      .eq('statut', 'a_venir')
      .lt('date_culte', today)
      .select('id')
    return (data ?? []).length
  } catch {
    return 0
  }
}

// ── getCultes ──────────────────────────────────────────────────────────────

export async function getCultes(): Promise<DbResult<Culte[]>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('cultes')
      .select('*')
      .order('date_culte', { ascending: false })

    if (error) return { data: null, error: error.message }
    return { data: data as Culte[], error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── getCulteById ───────────────────────────────────────────────────────────

export async function getCulteById(id: string): Promise<DbResult<CulteAvecAnnonce>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('cultes')
      .select(`
        *,
        annonces (
          *,
          rubriques_annonce ( * )
        )
      `)
      .eq('id', id)
      .single()

    if (error) return { data: null, error: error.message }
    return { data: data as CulteAvecAnnonce, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── createCulte ────────────────────────────────────────────────────────────

export type CreateCultePayload = {
  date_culte:  string         // 'YYYY-MM-DD'
  theme?:      string | null
  predicateur?: string | null
  statut?:     'a_venir' | 'passe'
}

export async function createCulte(payload: CreateCultePayload): Promise<DbResult<Culte>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('cultes')
      .insert({
        date_culte:  payload.date_culte,
        theme:       payload.theme ?? null,
        predicateur: payload.predicateur ?? null,
        statut:      payload.statut ?? 'a_venir',
      })
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: data as Culte, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── createAnnonce ──────────────────────────────────────────────────────────
// Creates the annonce row then inserts the 7 default empty rubriques.

export async function createAnnonce(culteId: string): Promise<DbResult<AnnonceAvecRubriques>> {
  try {
    const db = await getDb()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: annonce, error: annonceError } = await (db as any)
      .from('annonces')
      .insert({ culte_id: culteId, statut_global: 'brouillon' })
      .select()
      .single()

    if (annonceError) return { data: null, error: annonceError.message }

    const rubriquesPayload = RUBRIQUES_CONFIG.map((r) => ({
      annonce_id:     annonce.id as string,
      code_rubrique:  r.code,
      ordre:          r.ordre,
      donnees_brutes: null,
      texte_genere:   null,
      texte_final:    null,
      reconduire:     'a_definir' as const,
      date_validite:  null,
      genere_le:      null,
      valide:         false,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rubriques, error: rubriquesError } = await (db as any)
      .from('rubriques_annonce')
      .insert(rubriquesPayload)
      .select()

    if (rubriquesError) return { data: null, error: rubriquesError.message }

    // Pré-charger les informations encore actives (reconduction) — best-effort
    const rubriquesFinales = await preChargerInfosActives(db, rubriques as RubriqueAnnonce[])
      .catch(() => rubriques as RubriqueAnnonce[])

    return {
      data: { ...annonce, rubriques_annonce: rubriquesFinales } as AnnonceAvecRubriques,
      error: null,
    }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── Pré-chargement des informations actives ────────────────────────────────
// À la création d'une annonce, reprend depuis l'annonce la plus récente les
// événements et informations (conférence / district / circuit / église locale)
// encore valides : date de fin non dépassée, ou marqués reconductibles.

interface ItemReconductible {
  date?:           string
  evenement_date?: string
  date_fin?:       string
  reconductible?:  boolean
}

function estActif(item: ItemReconductible, today: string): boolean {
  if (item.reconductible) return true
  if (item.date_fin) return item.date_fin >= today
  const date = item.date || item.evenement_date
  return !!date && date >= today
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function preChargerInfosActives(db: any, rubriques: RubriqueAnnonce[]): Promise<RubriqueAnnonce[]> {
  const codes = ['conference', 'district', 'circuit', 'eglise_local']
  const today = new Date().toISOString().slice(0, 10)

  // Annonce la plus récente (hors celle en cours de création)
  const annonceIds = new Set(rubriques.map(r => r.annonce_id))
  const { data: dernieres } = await db
    .from('annonces')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(5)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const precedenteId = ((dernieres ?? []) as any[]).map(a => a.id).find(id => !annonceIds.has(id))
  if (!precedenteId) return rubriques

  const { data: precedentes } = await db
    .from('rubriques_annonce')
    .select('code_rubrique, donnees_brutes')
    .eq('annonce_id', precedenteId)
    .in('code_rubrique', codes)
    .not('donnees_brutes', 'is', null)

  const derniereParCode = new Map<string, string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((precedentes ?? []) as any[])) {
    derniereParCode.set(r.code_rubrique, r.donnees_brutes)
  }

  const resultat = [...rubriques]
  for (const code of codes) {
    const json = derniereParCode.get(code)
    if (!json) continue
    let data: Record<string, unknown>
    try { data = JSON.parse(json) } catch { continue }

    const seed: Record<string, unknown> = {}
    const evenements = (data.evenements as ItemReconductible[] | undefined)
      ?.filter(e => estActif(e, today))
    if (code === 'eglise_local') {
      const infos = (data.infos as ItemReconductible[] | undefined)?.filter(i => estActif(i, today))
      if (infos?.length) seed.infos = infos
      const activites = (data.activites_classes as ItemReconductible[] | undefined)
        ?.filter(a => estActif(a, today))
      if (activites?.length) seed.activites_classes = activites
    } else if (evenements?.length) {
      seed.evenements = evenements
    }

    if (Object.keys(seed).length === 0) continue

    const cible = resultat.find(r => r.code_rubrique === code)
    if (!cible) continue

    const donnees = JSON.stringify(seed)
    await db.from('rubriques_annonce').update({ donnees_brutes: donnees }).eq('id', cible.id)
    cible.donnees_brutes = donnees
  }

  return resultat
}

// ── updateAnnonce ──────────────────────────────────────────────────────────

export async function updateAnnonce(
  id: string,
  data: { statut_global?: StatutAnnonce; texte_genere?: string | null },
): Promise<DbResult<Annonce>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error } = await (db as any)
      .from('annonces')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: updated as Annonce, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── updateRubrique ─────────────────────────────────────────────────────────

export type UpdateRubriquePayload = Partial<{
  donnees_brutes: string | null
  texte_genere:   string | null
  texte_final:    string | null
  reconduire:     StatutReconduite
  date_validite:  string | null
  genere_le:      string | null
  valide:         boolean
}>

export async function updateRubrique(
  id: string,
  data: UpdateRubriquePayload,
): Promise<DbResult<RubriqueAnnonce>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error } = await (db as any)
      .from('rubriques_annonce')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: updated as RubriqueAnnonce, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── updateStatutReconduite ─────────────────────────────────────────────────

export async function updateStatutReconduite(
  id: string,
  statut: StatutReconduite,
): Promise<DbResult<RubriqueAnnonce>> {
  return updateRubrique(id, { reconduire: statut })
}

// ── getAnnonceAvecCulte ────────────────────────────────────────────────────
// Fetch one annonce by its ID, including parent culte and all rubriques.

export async function getAnnonceAvecCulte(annonceId: string): Promise<DbResult<AnnonceAvecCulte>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('annonces')
      .select(`
        *,
        cultes ( * ),
        rubriques_annonce ( * )
      `)
      .eq('id', annonceId)
      .single()

    if (error) return { data: null, error: error.message }
    return { data: data as AnnonceAvecCulte, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── getHistoriqueAnnonces ──────────────────────────────────────────────────
// Tous les cultes passés, du plus récent au plus ancien, avec leurs annonces.

export async function getHistoriqueAnnonces(): Promise<DbResult<CulteAvecAnnonce[]>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('cultes')
      .select(`
        *,
        annonces (
          *,
          rubriques_annonce ( * )
        )
      `)
      .eq('statut', 'passe')
      .order('date_culte', { ascending: false })

    if (error) return { data: null, error: error.message }
    return { data: data as CulteAvecAnnonce[], error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── getCultesAvenir ────────────────────────────────────────────────────────
// Tous les cultes a_venir triés par date croissante, avec leurs annonces.

export async function getCultesAvenir(): Promise<DbResult<CulteAvecAnnonce[]>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('cultes')
      .select(`
        *,
        annonces (
          *,
          rubriques_annonce ( * )
        )
      `)
      .eq('statut', 'a_venir')
      .order('date_culte', { ascending: true })

    if (error) return { data: null, error: error.message }
    return { data: data as CulteAvecAnnonce[], error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── getAnnoncePrecedente ───────────────────────────────────────────────────
// Most recent culte with statut='passe' including its annonce and rubriques.

export async function getAnnoncePrecedente(): Promise<DbResult<CulteAvecAnnonce | null>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('cultes')
      .select(`
        *,
        annonces (
          *,
          rubriques_annonce ( * )
        )
      `)
      .eq('statut', 'passe')
      .order('date_culte', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return { data: null, error: error.message }
    return { data: data as CulteAvecAnnonce | null, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}
