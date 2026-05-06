'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

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

export type MembreCMPayload = {
  prenom:      string
  nom:         string
  telephone:   string | null
  email:       string | null
  specialites: string[]
  plateformes: string[]
  notes:       string | null
}

// ── creerMembreCMAction ───────────────────────────────────────────────────────

export async function creerMembreCMAction(
  payload: MembreCMPayload,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('membres_cm')
      .insert({ ...payload, actif: true })

    if (error) return { success: false, error: (error as { message: string }).message }

    revalidatePath('/community/equipe')
    revalidatePath('/community/planning')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── modifierMembreCMAction ────────────────────────────────────────────────────

export async function modifierMembreCMAction(
  id:      string,
  payload: MembreCMPayload,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('membres_cm')
      .update(payload)
      .eq('id', id)

    if (error) return { success: false, error: (error as { message: string }).message }

    revalidatePath('/community/equipe')
    revalidatePath('/community/planning')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── toggleActifMembreCMAction ─────────────────────────────────────────────────

export async function toggleActifMembreCMAction(
  id:    string,
  actif: boolean,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('membres_cm')
      .update({ actif })
      .eq('id', id)

    if (error) return { success: false, error: (error as { message: string }).message }

    revalidatePath('/community/equipe')
    revalidatePath('/community/planning')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
