'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { StatutCulte } from '@/lib/supabase/types'

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

export type ActionResult = { success: true } | { success: false; error: string }

export async function creerCulte(date_culte: string): Promise<ActionResult> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('planning_son').insert({
    date_culte,
    statut: 'planifie',
    created_by: user.id,
  })

  if (error) {
    const msg = (error as { message: string }).message
    if (msg.includes('unique')) return { success: false, error: 'Un culte existe déjà à cette date.' }
    return { success: false, error: msg }
  }

  revalidatePath('/sonorisation/planning')
  return { success: true }
}

export async function modifierAssignation(
  id: number,
  role: 'responsable' | 'assistant1' | 'assistant2',
  membreId: number | null,
): Promise<ActionResult> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const colonne = `${role}_id`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('planning_son')
    .update({ [colonne]: membreId })
    .eq('id', id)

  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/sonorisation/planning')
  return { success: true }
}

export async function modifierStatutCulte(id: number, statut: StatutCulte): Promise<ActionResult> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('planning_son').update({ statut }).eq('id', id)
  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/sonorisation/planning')
  return { success: true }
}

export async function supprimerCulte(id: number): Promise<ActionResult> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('planning_son').delete().eq('id', id)
  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/sonorisation/planning')
  return { success: true }
}
