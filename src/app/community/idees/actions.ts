'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/api-auth'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { PrioritéIdee } from '@/types/community'

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
          catch { /* Server Action */ }
        },
      },
    },
  )
}

export interface IdeaPayload {
  titre:        string
  description?: string | null
  plateforme:   string[]
  type_contenu?: string | null
  priorite:     PrioritéIdee
}

export async function createIdeaAction(data: IdeaPayload) {
  const { unauthorized } = await requireAuth()
  if (unauthorized) throw new Error('Non autorisé')

  const db = await getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (db as any)
    .from('idees_contenu')
    .insert({ ...data, statut: 'idee' })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/community/idees')
  return { data: result, error: null }
}

export async function updateIdeaStatutAction(id: string, statut: string) {
  const { unauthorized } = await requireAuth()
  if (unauthorized) throw new Error('Non autorisé')

  const db = await getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('idees_contenu')
    .update({ statut })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/community/idees')
  return { error: null }
}
