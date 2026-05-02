'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { RoleCaptation } from '@/types/captation'

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

export type MembrePayload = {
  prenom:    string
  nom:       string
  telephone: string | null
  email:     string | null
  roles:     RoleCaptation[]
  notes:     string | null
}

// ── creerMembreCaptationAction ─────────────────────────────────────────────

export async function creerMembreCaptationAction(
  payload: MembrePayload,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('membres_captation')
      .insert({ ...payload, actif: true })

    if (error) return { success: false, error: (error as { message: string }).message }

    revalidatePath('/captation/equipe')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── modifierMembreCaptationAction ──────────────────────────────────────────

export async function modifierMembreCaptationAction(
  id:      string,
  payload: MembrePayload,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('membres_captation')
      .update(payload)
      .eq('id', id)

    if (error) return { success: false, error: (error as { message: string }).message }

    revalidatePath('/captation/equipe')
    revalidatePath('/captation/planning')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── toggleActifMembreCaptationAction ──────────────────────────────────────

export async function toggleActifMembreCaptationAction(
  id:    string,
  actif: boolean,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('membres_captation')
      .update({ actif })
      .eq('id', id)

    if (error) return { success: false, error: (error as { message: string }).message }

    revalidatePath('/captation/equipe')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
