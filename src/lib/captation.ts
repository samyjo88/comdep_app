import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type {
  MembreCaptation,
  PlanningCaptation,
  PlanningAvecMembre,
  PlanningCulteComplet,
  DossierDrive,
  LivraisonCaptation,
  StatistiquesEquipe,
  RoleCaptation,
  StatutPlanning,
  StatutLivraison,
  TypeLivrable,
} from '@/types/captation'
import type { Culte } from '@/types/annonces'

export type {
  MembreCaptation,
  PlanningCaptation,
  PlanningAvecMembre,
  PlanningCulteComplet,
  DossierDrive,
  LivraisonCaptation,
  StatistiquesEquipe,
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

// ── getMembresCaptation ────────────────────────────────────────────────────

export async function getMembresCaptation(
  actifSeulement = false,
): Promise<DbResult<MembreCaptation[]>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (db as any)
      .from('membres_captation')
      .select('*')
      .order('nom', { ascending: true })

    if (actifSeulement) query = query.eq('actif', true)

    const { data, error } = await query
    if (error) return { data: null, error: error.message }
    return { data: data as MembreCaptation[], error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── getPlanningByMonth ─────────────────────────────────────────────────────
// Retourne tous les cultes du mois avec leurs assignments et membres.

export async function getPlanningByMonth(
  annee: number,
  mois: number,
): Promise<DbResult<PlanningCulteComplet[]>> {
  try {
    const db = await getDb()

    const dateDebut = `${annee}-${String(mois).padStart(2, '0')}-01`
    const dateFin   = new Date(annee, mois, 0).toISOString().slice(0, 10)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cultes, error: cultesError } = await (db as any)
      .from('cultes')
      .select('*')
      .gte('date_culte', dateDebut)
      .lte('date_culte', dateFin)
      .order('date_culte', { ascending: true })

    if (cultesError) return { data: null, error: cultesError.message }
    if (!cultes || cultes.length === 0) return { data: [], error: null }

    const culteIds: string[] = (cultes as Culte[]).map(c => c.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [planningRes, dossiersRes, livraisonsRes] = await Promise.all([
      (db as any)
        .from('planning_captation')
        .select('*, membres_captation(*)')
        .in('culte_id', culteIds),
      (db as any)
        .from('dossiers_drive')
        .select('*')
        .in('culte_id', culteIds),
      (db as any)
        .from('livraisons_captation')
        .select('*')
        .in('culte_id', culteIds),
    ])

    if (planningRes.error)    return { data: null, error: planningRes.error.message }
    if (dossiersRes.error)    return { data: null, error: dossiersRes.error.message }
    if (livraisonsRes.error)  return { data: null, error: livraisonsRes.error.message }

    const assignmentsByCulte = groupById<PlanningAvecMembre>(planningRes.data,    'culte_id')
    const dossiersByCulte    = indexById<DossierDrive>(dossiersRes.data,           'culte_id')
    const livraisonsByCulte  = groupById<LivraisonCaptation>(livraisonsRes.data,  'culte_id')

    const result: PlanningCulteComplet[] = (cultes as Culte[]).map(culte => ({
      culte,
      assignments:   assignmentsByCulte[culte.id]  ?? [],
      dossier_drive: dossiersByCulte[culte.id]     ?? null,
      livraisons:    livraisonsByCulte[culte.id]   ?? [],
    }))

    return { data: result, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── getPlanningByCulte ─────────────────────────────────────────────────────

export async function getPlanningByCulte(
  culteId: string,
): Promise<DbResult<PlanningCulteComplet>> {
  try {
    const db = await getDb()

    const [culteRes, assignmentsRes, dossierRes, livraisonsRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any).from('cultes').select('*').eq('id', culteId).single(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any)
        .from('planning_captation')
        .select('*, membres_captation(*)')
        .eq('culte_id', culteId),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any)
        .from('dossiers_drive')
        .select('*')
        .eq('culte_id', culteId)
        .maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any)
        .from('livraisons_captation')
        .select('*')
        .eq('culte_id', culteId)
        .order('created_at', { ascending: true }),
    ])

    if (culteRes.error)       return { data: null, error: culteRes.error.message }
    if (assignmentsRes.error) return { data: null, error: assignmentsRes.error.message }
    if (dossierRes.error)     return { data: null, error: dossierRes.error.message }
    if (livraisonsRes.error)  return { data: null, error: livraisonsRes.error.message }

    return {
      data: {
        culte:         culteRes.data as Culte,
        assignments:   assignmentsRes.data as PlanningAvecMembre[],
        dossier_drive: dossierRes.data as DossierDrive | null,
        livraisons:    livraisonsRes.data as LivraisonCaptation[],
      },
      error: null,
    }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── upsertAssignment ───────────────────────────────────────────────────────
// Insert ou update via la contrainte UNIQUE(culte_id, role_du_jour).

export async function upsertAssignment(
  culteId:  string,
  membreId: string,
  role:     RoleCaptation,
): Promise<DbResult<PlanningCaptation>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('planning_captation')
      .upsert(
        { culte_id: culteId, membre_id: membreId, role_du_jour: role, statut: 'planifie' },
        { onConflict: 'culte_id,role_du_jour' },
      )
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: data as PlanningCaptation, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── updateStatutAssignment ─────────────────────────────────────────────────

export async function updateStatutAssignment(
  id:     string,
  statut: StatutPlanning,
): Promise<DbResult<PlanningCaptation>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('planning_captation')
      .update({ statut })
      .eq('id', id)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: data as PlanningCaptation, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── getDossierDrive ────────────────────────────────────────────────────────

export async function getDossierDrive(
  culteId: string,
): Promise<DbResult<DossierDrive | null>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('dossiers_drive')
      .select('*')
      .eq('culte_id', culteId)
      .maybeSingle()

    if (error) return { data: null, error: error.message }
    return { data: data as DossierDrive | null, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── upsertDossierDrive ─────────────────────────────────────────────────────

export type DossierDrivePayload = Partial<
  Omit<DossierDrive, 'id' | 'culte_id' | 'created_at'>
>

export async function upsertDossierDrive(
  culteId: string,
  data:    DossierDrivePayload,
): Promise<DbResult<DossierDrive>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (db as any)
      .from('dossiers_drive')
      .upsert({ culte_id: culteId, ...data }, { onConflict: 'culte_id' })
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: result as DossierDrive, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── getLivraisonsByCulte ───────────────────────────────────────────────────

export async function getLivraisonsByCulte(
  culteId: string,
): Promise<DbResult<LivraisonCaptation[]>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('livraisons_captation')
      .select('*')
      .eq('culte_id', culteId)
      .order('created_at', { ascending: true })

    if (error) return { data: null, error: error.message }
    return { data: data as LivraisonCaptation[], error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── upsertLivraison ────────────────────────────────────────────────────────

export type LivraisonPayload = {
  id?:            string
  culte_id:       string
  type_livrable:  TypeLivrable
  nom_fichier?:   string | null
  lien_drive?:    string | null
  statut?:        StatutLivraison
  assignee_id?:   string | null
  date_limite?:   string | null
  notes?:         string | null
}

export async function upsertLivraison(
  data: LivraisonPayload,
): Promise<DbResult<LivraisonCaptation>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (db as any)
      .from('livraisons_captation')
      .upsert(data)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: result as LivraisonCaptation, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── getStatistiquesEquipe ──────────────────────────────────────────────────

export async function getStatistiquesEquipe(
  membreId: string,
): Promise<DbResult<StatistiquesEquipe>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('planning_captation')
      .select('culte_id, role_du_jour')
      .eq('membre_id', membreId)

    if (error) return { data: null, error: error.message }

    const rows = data as { culte_id: string; role_du_jour: RoleCaptation }[]

    const culteIds   = new Set(rows.map(r => r.culte_id))
    const roleCount  = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.role_du_jour] = (acc[r.role_du_jour] ?? 0) + 1
      return acc
    }, {})

    return {
      data: {
        nb_cultes_couverts: culteIds.size,
        roles_joues: Object.entries(roleCount).map(([role, nb]) => ({
          role: role as RoleCaptation,
          nb,
        })),
      },
      error: null,
    }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── Helpers internes ───────────────────────────────────────────────────────

function groupById<T>(items: T[], key: keyof T): Record<string, T[]> {
  return (items ?? []).reduce<Record<string, T[]>>((acc, item) => {
    const k = String(item[key])
    ;(acc[k] ??= []).push(item)
    return acc
  }, {})
}

function indexById<T>(items: T[], key: keyof T): Record<string, T> {
  return (items ?? []).reduce<Record<string, T>>((acc, item) => {
    acc[String(item[key])] = item
    return acc
  }, {})
}
