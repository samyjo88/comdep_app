'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export interface ModifierCulteData {
  id:          string
  date_culte:  string
  theme:       string | null
  predicateur: string | null
}

export async function modifierCulte(
  data: ModifierCulteData,
): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('cultes')
    .update({
      date_culte:  data.date_culte,
      theme:       data.theme || null,
      predicateur: data.predicateur || null,
    })
    .eq('id', data.id)

  if (error) return { error: error.message }

  revalidatePath('/annonces')
  return {}
}

export async function supprimerCulte(id: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  // Cascade: rubriques → annonces → culte (in case DB cascade isn't set)
  const { data: annonces } = await supabase
    .from('annonces')
    .select('id')
    .eq('culte_id', id)

  if (annonces && annonces.length > 0) {
    const annonceIds = annonces.map((a: { id: string }) => a.id)
    await supabase.from('rubriques_annonce').delete().in('annonce_id', annonceIds)
    await supabase.from('annonces').delete().in('id', annonceIds)
  }

  const { error } = await supabase.from('cultes').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/annonces')
  return {}
}
