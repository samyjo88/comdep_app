import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type {
  MembreCM,
  PlanningCM,
  PlanningWeekComplet,
  Post,
  RapportCM,
  IdeaContenu,
  StatutPost,
  StatsHebdo,
  Plateforme,
} from '@/types/community'

export type {
  MembreCM,
  PlanningCM,
  PlanningWeekComplet,
  Post,
  RapportCM,
  IdeaContenu,
  StatsHebdo,
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

// ── getMembresCM ──────────────────────────────────────────────────────────────

export async function getMembresCM(
  actifSeulement = false,
): Promise<DbResult<MembreCM[]>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (db as any)
      .from('membres_cm')
      .select('*')
      .order('nom', { ascending: true })

    if (actifSeulement) query = query.eq('actif', true)

    const { data, error } = await query
    if (error) return { data: null, error: error.message }
    return { data: data as MembreCM[], error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── getPlanningByMonth ────────────────────────────────────────────────────────

export async function getPlanningByMonth(
  annee: number,
  mois:  number,
): Promise<DbResult<PlanningCM[]>> {
  try {
    const db = await getDb()

    const dateDebut = `${annee}-${String(mois).padStart(2, '0')}-01`
    const dateFin   = new Date(annee, mois, 0).toISOString().slice(0, 10)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('planning_cm')
      .select('*, membres_cm(*)')
      .gte('semaine_debut', dateDebut)
      .lte('semaine_debut', dateFin)
      .order('semaine_debut', { ascending: true })

    if (error) return { data: null, error: error.message }
    return { data: data as PlanningCM[], error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── getPlanningWeek ───────────────────────────────────────────────────────────

export async function getPlanningWeek(
  semaineDebut: string,
): Promise<DbResult<PlanningWeekComplet>> {
  try {
    const db = await getDb()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: planning, error: planningError } = await (db as any)
      .from('planning_cm')
      .select('*, membres_cm(*)')
      .eq('semaine_debut', semaineDebut)
      .maybeSingle()

    if (planningError) return { data: null, error: planningError.message }

    if (!planning) {
      return {
        data: { planning: null as unknown as PlanningCM, membre: null, posts: [] },
        error: null,
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: posts, error: postsError } = await (db as any)
      .from('posts')
      .select('*')
      .eq('semaine_planning_id', planning.id)
      .order('date_publication_prevue', { ascending: true })

    if (postsError) return { data: null, error: postsError.message }

    return {
      data: {
        planning: planning as PlanningCM,
        membre:   planning.membres_cm ?? null,
        posts:    (posts ?? []) as Post[],
      },
      error: null,
    }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── upsertPlanningWeek ────────────────────────────────────────────────────────

export type PlanningWeekPayload = {
  semaine_debut: string
  membre_id?:    string | null
  statut?:       PlanningCM['statut']
  notes?:        string | null
}

export async function upsertPlanningWeek(
  data: PlanningWeekPayload,
): Promise<DbResult<PlanningCM>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (db as any)
      .from('planning_cm')
      .upsert(data, { onConflict: 'semaine_debut' })
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: result as PlanningCM, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── getPostsBySemaine ─────────────────────────────────────────────────────────

export async function getPostsBySemaine(
  planningId: string,
): Promise<DbResult<Post[]>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('posts')
      .select('*')
      .eq('semaine_planning_id', planningId)
      .order('date_publication_prevue', { ascending: true })

    if (error) return { data: null, error: error.message }
    return { data: data as Post[], error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── getPostsByPlateforme ──────────────────────────────────────────────────────

export async function getPostsByPlateforme(
  plateforme: string,
  limite = 50,
): Promise<DbResult<Post[]>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('posts')
      .select('*')
      .eq('plateforme', plateforme)
      .order('date_publication_prevue', { ascending: false })
      .limit(limite)

    if (error) return { data: null, error: error.message }
    return { data: data as Post[], error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── createPost ────────────────────────────────────────────────────────────────

export type PostPayload = Omit<Post, 'id' | 'created_at' | 'updated_at'>

export async function createPost(
  data: PostPayload,
): Promise<DbResult<Post>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (db as any)
      .from('posts')
      .insert(data)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: result as Post, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── updatePost ────────────────────────────────────────────────────────────────

export type PostUpdatePayload = Partial<Omit<Post, 'id' | 'created_at' | 'updated_at'>>

export async function updatePost(
  id:   string,
  data: PostUpdatePayload,
): Promise<DbResult<Post>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (db as any)
      .from('posts')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: result as Post, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── deletePost ────────────────────────────────────────────────────────────────

export async function deletePost(id: string): Promise<DbResult<null>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('posts')
      .delete()
      .eq('id', id)

    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── updateStatutPost ──────────────────────────────────────────────────────────

export async function updateStatutPost(
  id:     string,
  statut: StatutPost,
): Promise<DbResult<Post>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('posts')
      .update({ statut })
      .eq('id', id)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: data as Post, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── getStatsHebdo ─────────────────────────────────────────────────────────────

export async function getStatsHebdo(
  semaineDebut: string,
): Promise<DbResult<StatsHebdo>> {
  try {
    const db = await getDb()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: planning, error: planningError } = await (db as any)
      .from('planning_cm')
      .select('id')
      .eq('semaine_debut', semaineDebut)
      .maybeSingle()

    if (planningError) return { data: null, error: planningError.message }

    if (!planning) {
      return {
        data: buildEmptyStats(),
        error: null,
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: posts, error: postsError } = await (db as any)
      .from('posts')
      .select('statut, plateforme')
      .eq('semaine_planning_id', planning.id)

    if (postsError) return { data: null, error: postsError.message }

    const rows = (posts ?? []) as Pick<Post, 'statut' | 'plateforme'>[]
    const stats = buildEmptyStats()

    stats.total = rows.length

    for (const row of rows) {
      if (row.statut === 'publie')        stats.publies++
      else if (row.statut === 'annule')   stats.annules++
      else                                stats.en_attente++

      const p = row.plateforme as Plateforme
      stats.par_plateforme[p] = (stats.par_plateforme[p] ?? 0) + 1
    }

    return { data: stats, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── getIdees ──────────────────────────────────────────────────────────────────

export async function getIdees(
  statut?: string,
): Promise<DbResult<IdeaContenu[]>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (db as any)
      .from('idees_contenu')
      .select('*')
      .order('created_at', { ascending: false })

    if (statut) query = query.eq('statut', statut)

    const { data, error } = await query
    if (error) return { data: null, error: error.message }
    return { data: data as IdeaContenu[], error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── createRapport ─────────────────────────────────────────────────────────────

export async function createRapport(
  semaineDebut: string,
): Promise<DbResult<RapportCM>> {
  try {
    const db = await getDb()

    const statsResult = await getStatsHebdo(semaineDebut)
    if (statsResult.error) return { data: null, error: statsResult.error }

    const stats = statsResult.data!

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: planning, error: planningError } = await (db as any)
      .from('planning_cm')
      .select('*, membres_cm(*)')
      .eq('semaine_debut', semaineDebut)
      .maybeSingle()

    if (planningError) return { data: null, error: planningError.message }

    const membreNom = planning?.membres_cm
      ? `${planning.membres_cm.prenom} ${planning.membres_cm.nom}`
      : 'Non assigné'

    const resumeTexte = buildResume(semaineDebut, membreNom, stats)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (db as any)
      .from('rapports_cm')
      .upsert(
        {
          semaine_debut: semaineDebut,
          contenu_json:  stats as unknown as Record<string, unknown>,
          resume_texte:  resumeTexte,
          genere_le:     new Date().toISOString(),
        },
        { onConflict: 'semaine_debut' },
      )
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: result as RapportCM, error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── getRapports ───────────────────────────────────────────────────────────────

export async function getRapports(
  limite = 10,
): Promise<DbResult<RapportCM[]>> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('rapports_cm')
      .select('*')
      .order('semaine_debut', { ascending: false })
      .limit(limite)

    if (error) return { data: null, error: error.message }
    return { data: data as RapportCM[], error: null }
  } catch (e) {
    return { data: null, error: String(e) }
  }
}

// ── Helpers internes ──────────────────────────────────────────────────────────

function buildEmptyStats(): StatsHebdo {
  return {
    total:          0,
    publies:        0,
    en_attente:     0,
    annules:        0,
    par_plateforme: {
      facebook:  0,
      instagram: 0,
      whatsapp:  0,
      youtube:   0,
      twitter:   0,
      tiktok:    0,
    },
  }
}

function buildResume(
  semaineDebut: string,
  membreNom:    string,
  stats:        StatsHebdo,
): string {
  const taux = stats.total > 0
    ? Math.round((stats.publies / stats.total) * 100)
    : 0

  const topPlateformes = Object.entries(stats.par_plateforme)
    .filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([p, n]) => `${p} (${n})`)
    .join(', ')

  return [
    `Semaine du ${semaineDebut} — Responsable : ${membreNom}.`,
    `${stats.total} post(s) planifié(s) : ${stats.publies} publié(s), ${stats.en_attente} en attente, ${stats.annules} annulé(s).`,
    `Taux de publication : ${taux}%.`,
    topPlateformes ? `Plateformes actives : ${topPlateformes}.` : '',
  ].filter(Boolean).join(' ')
}
