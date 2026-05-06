'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { StatutPost, Plateforme, TypeContenu } from '@/types/community'

export type ActionResult = { success: true } | { success: false; error: string }

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

export type PostPayload = {
  plateforme:              Plateforme
  type_contenu:            TypeContenu
  titre:                   string | null
  description:             string | null
  lien_media:              string | null
  date_publication_prevue: string | null
  assignee_id:             string | null
  statut:                  StatutPost
  notes:                   string | null
}

// ── creerPostAction ───────────────────────────────────────────────────────────

export async function creerPostAction(
  semaineDebut: string,
  payload: PostPayload,
): Promise<ActionResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = await getDb() as any

    // Ensure planning row exists for this week
    const { data: existing } = await db
      .from('planning_cm')
      .select('id')
      .eq('semaine_debut', semaineDebut)
      .maybeSingle()

    let planningId: string
    if (existing?.id) {
      planningId = existing.id
    } else {
      const { data: created, error: planErr } = await db
        .from('planning_cm')
        .insert({ semaine_debut: semaineDebut, statut: 'planifie' })
        .select('id')
        .single()
      if (planErr) return { success: false, error: (planErr as { message: string }).message }
      planningId = created.id
    }

    const { error } = await db
      .from('posts')
      .insert({ ...payload, semaine_planning_id: planningId })

    if (error) return { success: false, error: (error as { message: string }).message }

    revalidatePath('/community/posts')
    revalidatePath('/community/planning')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── modifierPostAction ────────────────────────────────────────────────────────

export async function modifierPostAction(
  id: string,
  payload: PostPayload,
): Promise<ActionResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = await getDb() as any
    const { error } = await db
      .from('posts')
      .update(payload)
      .eq('id', id)

    if (error) return { success: false, error: (error as { message: string }).message }

    revalidatePath('/community/posts')
    revalidatePath('/community/planning')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── supprimerPostAction ───────────────────────────────────────────────────────

export async function supprimerPostAction(id: string): Promise<ActionResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = await getDb() as any
    const { error } = await db.from('posts').delete().eq('id', id)

    if (error) return { success: false, error: (error as { message: string }).message }

    revalidatePath('/community/posts')
    revalidatePath('/community/planning')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── updateStatutPostAction ────────────────────────────────────────────────────

export async function updateStatutPostAction(
  id:     string,
  statut: StatutPost,
): Promise<ActionResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = await getDb() as any

    const updates: Record<string, unknown> = { statut }
    if (statut === 'publie') {
      updates.date_publication_reelle = new Date().toISOString()
    }

    const { error } = await db.from('posts').update(updates).eq('id', id)

    if (error) return { success: false, error: (error as { message: string }).message }

    revalidatePath('/community/posts')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
