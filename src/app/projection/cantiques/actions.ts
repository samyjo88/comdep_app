'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CantiquePayload = Record<string, any>

export async function createCantiqueAction(payload: CantiquePayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase.from('cantiques').insert(payload)
  if (error) return { error: error.message }
  revalidatePath('/projection/cantiques')
  return {}
}

export async function updateCantiqueAction(id: string, payload: CantiquePayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase.from('cantiques').update(payload).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/projection/cantiques')
  revalidatePath(`/projection/cantiques/${id}`)
  return {}
}

export async function deleteCantiqueAction(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase.from('cantiques').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/projection/cantiques')
  return {}
}
