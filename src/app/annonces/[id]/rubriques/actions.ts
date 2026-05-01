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

export async function validerTexteIA(
  rubriqueId: string,
  texteFinal: string,
): Promise<{ error?: string }> {
  const result = await updateRubrique(rubriqueId, { texte_final: texteFinal, valide: true })
  if (result.error) return { error: result.error }
  return {}
}
