'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { RoleCaptation, StatutPlanning, StatutLivraison, TypeLivrable } from '@/types/captation'

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

function revalidateBoth(culteId: string) {
  revalidatePath(`/captation/culte/${culteId}`)
  revalidatePath('/captation/planning')
}

// ── Assignments ────────────────────────────────────────────────────────────

export async function upsertAssignmentAction(
  culteId:  string,
  membreId: string,
  role:     RoleCaptation,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('planning_captation')
      .upsert(
        { culte_id: culteId, membre_id: membreId, role_du_jour: role, statut: 'planifie' },
        { onConflict: 'culte_id,role_du_jour' },
      )
    if (error) return { success: false, error: (error as { message: string }).message }
    revalidateBoth(culteId)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function deleteAssignmentAction(
  culteId: string,
  role:    RoleCaptation,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('planning_captation')
      .delete()
      .eq('culte_id', culteId)
      .eq('role_du_jour', role)
    if (error) return { success: false, error: (error as { message: string }).message }
    revalidateBoth(culteId)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function updateStatutAssignmentAction(
  id:      string,
  culteId: string,
  statut:  StatutPlanning,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('planning_captation')
      .update({ statut })
      .eq('id', id)
    if (error) return { success: false, error: (error as { message: string }).message }
    revalidateBoth(culteId)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── Livrables ──────────────────────────────────────────────────────────────

export type LivraisonPayload = {
  type_livrable: TypeLivrable
  nom_fichier:   string | null
  assignee_id:   string | null
  date_limite:   string | null
  lien_drive:    string | null
  notes:         string | null
}

export async function creerLivraisonAction(
  culteId: string,
  payload: LivraisonPayload,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('livraisons_captation')
      .insert({ culte_id: culteId, statut: 'a_faire', ...payload })
    if (error) return { success: false, error: (error as { message: string }).message }
    revalidateBoth(culteId)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function updateStatutLivraisonAction(
  id:      string,
  culteId: string,
  statut:  StatutLivraison,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('livraisons_captation')
      .update({ statut })
      .eq('id', id)
    if (error) return { success: false, error: (error as { message: string }).message }
    revalidateBoth(culteId)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function supprimerLivraisonAction(
  id:      string,
  culteId: string,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('livraisons_captation')
      .delete()
      .eq('id', id)
    if (error) return { success: false, error: (error as { message: string }).message }
    revalidateBoth(culteId)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── Notes ──────────────────────────────────────────────────────────────────

export async function sauvegarderNotesAction(
  culteId: string,
  notes:   string,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('cultes')
      .update({ notes_captation: notes })
      .eq('id', culteId)
    if (error) return { success: false, error: (error as { message: string }).message }
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
