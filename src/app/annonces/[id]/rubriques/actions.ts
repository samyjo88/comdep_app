'use server'

import { updateRubrique } from '@/lib/annonces'

export async function sauvegarderRubrique(
  rubriqueId: string,
  donneesBrutes: string,
): Promise<{ error?: string }> {
  const result = await updateRubrique(rubriqueId, { donnees_brutes: donneesBrutes })
  if (result.error) return { error: result.error }
  return {}
}
