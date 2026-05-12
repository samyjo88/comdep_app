'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function upsertPlanningAction(payload: {
  culte_id:     string
  role_du_jour: string
  membre_id:    string | null
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { culte_id, role_du_jour, membre_id } = payload

  if (!membre_id) {
    const { error } = await supabase
      .from('planning_projection')
      .delete()
      .eq('culte_id', culte_id)
      .eq('role_du_jour', role_du_jour)
    if (error) return { error: error.message as string }
  } else {
    const { error } = await supabase
      .from('planning_projection')
      .upsert(
        { culte_id, role_du_jour, membre_id, statut: 'planifie' },
        { onConflict: 'culte_id,role_du_jour' },
      )
    if (error) return { error: error.message as string }
  }

  revalidatePath('/projection/planning')
  return {}
}

export async function updatePlanningStatusAction(
  planning_id: string,
  statut: 'planifie' | 'confirme' | 'present' | 'absent',
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase
    .from('planning_projection')
    .update({ statut })
    .eq('id', planning_id)
  if (error) return { error: error.message as string }
  revalidatePath('/projection/planning')
  return {}
}

export async function createCulteAction(payload: {
  date_culte:   string
  theme?:       string | null
  predicateur?: string | null
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase.from('cultes').insert({
    date_culte:  payload.date_culte,
    theme:       payload.theme       ?? null,
    predicateur: payload.predicateur ?? null,
    statut:      'a_venir',
  })
  if (error) return { error: error.message as string }
  revalidatePath('/projection/planning')
  return {}
}
