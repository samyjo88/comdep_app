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

    return {
      data: { ...annonce, rubriques_annonce: rubriques as RubriqueAnnonce[] } as AnnonceAvecRubriques,
      error: null,
    }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── updateAnnonce ──────────────────────────────────────────────────────────

export async function updateAnnonce(
  id: string,
  data: { statut_global?: StatutAnnonce },
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
