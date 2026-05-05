'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { StatutPlanning } from '@/types/community'

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

// ── assignerMembreAction ───────────────────────────────────────────────────────
// Upsert sur semaine_debut — crée le planning s'il n'existe pas.

export async function assignerMembreAction(
  semaineDebut: string,
  membreId:     string | null,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('planning_cm')
      .upsert({ semaine_debut: semaineDebut, membre_id: membreId }, { onConflict: 'semaine_debut' })

    if (error) return { success: false, error: (error as { message: string }).message }
    revalidatePath('/community/planning')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── updateStatutAction ────────────────────────────────────────────────────────

export async function updateStatutAction(
  semaineDebut: string,
  statut:       StatutPlanning,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('planning_cm')
      .upsert({ semaine_debut: semaineDebut, statut }, { onConflict: 'semaine_debut' })

    if (error) return { success: false, error: (error as { message: string }).message }
    revalidatePath('/community/planning')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── updateNotesAction ─────────────────────────────────────────────────────────

export async function updateNotesAction(
  semaineDebut: string,
  notes:        string,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('planning_cm')
      .upsert({ semaine_debut: semaineDebut, notes }, { onConflict: 'semaine_debut' })

    if (error) return { success: false, error: (error as { message: string }).message }
    revalidatePath('/community/planning')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── updateChecklistAction ─────────────────────────────────────────────────────

export async function updateChecklistAction(
  semaineDebut: string,
  checklist:    Record<string, boolean>,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('planning_cm')
      .upsert(
        { semaine_debut: semaineDebut, notes_json: { checklist } },
        { onConflict: 'semaine_debut' },
      )

    if (error) return { success: false, error: (error as { message: string }).message }
    revalidatePath('/community/planning')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
