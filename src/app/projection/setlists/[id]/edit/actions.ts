'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMap = Record<string, any>

export async function addSetlistItemAction(payload: {
  setlist_id:        string
  cantique_id:       string
  position:          number
  moment_culte?:     string | null
  tonalite_utilisee?: string | null
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const { data, error } = await supabase
    .from('setlist_items')
    .insert({
      setlist_id:        payload.setlist_id,
      cantique_id:       payload.cantique_id,
      position:          payload.position,
      moment_culte:      payload.moment_culte      ?? null,
      tonalite_utilisee: payload.tonalite_utilisee ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message as string }
  revalidatePath('/projection/setlists')
  return { id: data.id as string }
}

export async function removeSetlistItemAction(item_id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase.from('setlist_items').delete().eq('id', item_id)
  if (error) return { error: error.message as string }
  return {}
}

export async function reorderSetlistItemsAction(
  items: { id: string; position: number }[],
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const results: AnyMap[] = await Promise.all(
    items.map(({ id, position }) =>
      supabase.from('setlist_items').update({ position }).eq('id', id),
    ),
  )
  const failed = results.find(r => r.error)
  if (failed?.error) return { error: failed.error.message as string }
  return {}
}

export async function updateSetlistItemAction(
  item_id: string,
  fields: {
    moment_culte?:      string | null
    tonalite_utilisee?: string | null
    notes_operateur?:   string | null
  },
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase
    .from('setlist_items')
    .update(fields)
    .eq('id', item_id)
  if (error) return { error: error.message as string }
  return {}
}

export async function updateSetlistStatusAction(
  setlist_id: string,
  statut: 'brouillon' | 'valide' | 'utilise',
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase
    .from('setlists')
    .update({ statut })
    .eq('id', setlist_id)
  if (error) return { error: error.message as string }
  revalidatePath('/projection/setlists')
  revalidatePath(`/projection/setlists/${setlist_id}/apercu`)
  return {}
}
