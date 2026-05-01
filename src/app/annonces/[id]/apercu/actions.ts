'use server'

import { updateRubrique, updateAnnonce } from '@/lib/annonces'

export async function validerRubriqueGeneree(
  rubriqueId: string,
  texte: string,
): Promise<{ error?: string }> {
  const result = await updateRubrique(rubriqueId, { texte_final: texte, valide: true })
  if (result.error) return { error: result.error }
  return {}
}

export async function publierAnnonce(
  annonceId: string,
): Promise<{ error?: string }> {
  const result = await updateAnnonce(annonceId, { statut_global: 'valide' })
  if (result.error) return { error: result.error }
  return {}
}
