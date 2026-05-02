'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { RoleCaptation, StatutPlanning } from '@/types/captation'

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

// ── creerCulteAction ───────────────────────────────────────────────────────

export async function creerCulteAction(dateCulte: string): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('cultes')
      .insert({ date_culte: dateCulte, statut: 'a_venir' })

    if (error) {
      const msg = (error as { message: string }).message
      if (msg.includes('unique')) return { success: false, error: 'Un culte existe déjà à cette date.' }
      return { success: false, error: msg }
    }

    revalidatePath('/captation/planning')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── upsertAssignmentAction ─────────────────────────────────────────────────

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

    revalidatePath('/captation/planning')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── deleteAssignmentAction ─────────────────────────────────────────────────

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

    revalidatePath('/captation/planning')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── updateStatutAssignmentAction ───────────────────────────────────────────

export async function updateStatutAssignmentAction(
  id:     string,
  statut: StatutPlanning,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('planning_captation')
      .update({ statut })
      .eq('id', id)

    if (error) return { success: false, error: (error as { message: string }).message }

    revalidatePath('/captation/planning')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
