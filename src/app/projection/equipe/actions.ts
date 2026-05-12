'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type MembrePayload = {
  prenom:     string
  nom:        string
  telephone?: string | null
  email?:     string | null
  roles:      string[]
  notes?:     string | null
  actif?:     boolean
}

export async function createMembreAction(payload: MembrePayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase
    .from('membres_projection')
    .insert({ ...payload, actif: payload.actif ?? true })
  if (error) return { error: error.message as string }
  revalidatePath('/projection/equipe')
  return {}
}

export async function updateMembreAction(id: string, payload: Partial<MembrePayload>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase
    .from('membres_projection')
    .update(payload)
    .eq('id', id)
  if (error) return { error: error.message as string }
  revalidatePath('/projection/equipe')
  return {}
}

export async function toggleActifAction(id: string, actif: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase
    .from('membres_projection')
    .update({ actif })
    .eq('id', id)
  if (error) return { error: error.message as string }
  revalidatePath('/projection/equipe')
  return {}
}
