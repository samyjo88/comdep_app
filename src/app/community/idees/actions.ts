'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { PrioritéIdee } from '@/types/community'

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

export type IdeePayload = {
  titre:        string
  description:  string | null
  plateforme:   string[]
  type_contenu: string | null
  priorite:     PrioritéIdee
}

// ── creerIdeeAction ───────────────────────────────────────────────────────────

export async function creerIdeeAction(payload: IdeePayload): Promise<ActionResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = await getDb() as any
    const { error } = await db.from('idees_contenu').insert({ ...payload, statut: 'idee' })
    if (error) return { success: false, error: (error as { message: string }).message }
    revalidatePath('/community/idees')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── approuverIdeeAction ───────────────────────────────────────────────────────

export async function approuverIdeeAction(id: string): Promise<ActionResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = await getDb() as any
    const { error } = await db
      .from('idees_contenu')
      .update({ statut: 'approuvee' })
      .eq('id', id)
    if (error) return { success: false, error: (error as { message: string }).message }
    revalidatePath('/community/idees')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── marquerUtiliseeAction ─────────────────────────────────────────────────────

export async function marquerUtiliseeAction(id: string): Promise<ActionResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = await getDb() as any
    const { error } = await db
      .from('idees_contenu')
      .update({ statut: 'utilisee' })
      .eq('id', id)
    if (error) return { success: false, error: (error as { message: string }).message }
    revalidatePath('/community/idees')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── supprimerIdeeAction ───────────────────────────────────────────────────────

export async function supprimerIdeeAction(id: string): Promise<ActionResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = await getDb() as any
    const { error } = await db.from('idees_contenu').delete().eq('id', id)
    if (error) return { success: false, error: (error as { message: string }).message }
    revalidatePath('/community/idees')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
