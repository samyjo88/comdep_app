'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { PrioriteAchat, StatutAchat } from '@/lib/supabase/types'

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

export type AchatPayload = {
  nom: string
  quantite: number
  budget_estime: number | null
  priorite: PrioriteAchat
  notes: string | null
}

export type ActionResult = { success: true } | { success: false; error: string }

export async function creerAchat(payload: AchatPayload): Promise<ActionResult> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('achats_planifies').insert({
    ...payload,
    statut: 'en_attente',
    created_by: user.id,
  })

  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/sonorisation/materiel')
  return { success: true }
}

export async function modifierStatutAchat(id: number, statut: StatutAchat): Promise<ActionResult> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('achats_planifies').update({ statut }).eq('id', id)
  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/sonorisation/materiel')
  return { success: true }
}

export async function supprimerAchat(id: number): Promise<ActionResult> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('achats_planifies').delete().eq('id', id)
  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/sonorisation/materiel')
  return { success: true }
}
