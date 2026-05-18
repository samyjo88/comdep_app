'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

const TABLE_MAP: Record<string, string> = {
  Sonorisation: 'membres_son',
  Captation:    'membres_captation',
  Community:    'membres_cm',
  Annonces:     'membres_annonces',
  Projection:   'membres_projection',
}

export async function supprimerMembreDashboard(
  id: string | number,
  departement: string,
): Promise<{ error?: string }> {
  // Vérifier super_admin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'super_admin') return { error: 'Accès refusé' }

  const table = TABLE_MAP[departement]
  if (!table) return { error: `Département inconnu : ${departement}` }

  const admin = createAdminClient()
  const { error } = await admin.from(table).delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return {}
}
