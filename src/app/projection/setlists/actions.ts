'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSetlistAction(payload: {
  culte_id?:      string | null
  titre_setlist?: string | null
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const { data, error } = await supabase
    .from('setlists')
    .insert({
      culte_id:      payload.culte_id      ?? null,
      titre_setlist: payload.titre_setlist ?? null,
      statut:        'brouillon',
    })
    .select('id')
    .single()

  if (error) return { error: error.message as string }
  revalidatePath('/projection/setlists')
  return { id: data.id as string }
}
