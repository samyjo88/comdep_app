'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Departement = 'son' | 'captation' | 'community'

export interface AjouterMembreData {
  prenom:      string
  nom:         string
  email:       string | null
  telephone:   string | null
  departement: Departement
}

export async function ajouterMembre(data: AjouterMembreData): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const payload = {
    prenom:    data.prenom.trim(),
    nom:       data.nom.trim(),
    email:     data.email?.trim() || null,
    telephone: data.telephone?.trim() || null,
    actif:     true,
    role:      'assistant',
  }

  const table =
    data.departement === 'son'       ? 'membres_son'      :
    data.departement === 'captation' ? 'membres_captation' :
    'membres_cm'

  const { error } = await supabase.from(table).insert(payload)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return {}
}
