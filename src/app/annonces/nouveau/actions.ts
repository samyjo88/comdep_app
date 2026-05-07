'use server'

import { redirect } from 'next/navigation'
import { createCulte, updateCulte, createAnnonce } from '@/lib/annonces'

export type NouveauCulteState =
  | { error: string }
  | { success: true; annonceId: string }

export async function preparerCulte(
  _prev: NouveauCulteState | null,
  formData: FormData,
): Promise<NouveauCulteState> {
  const culteId     = (formData.get('culte_id')    as string | null)?.trim() || null
  const dateCulte   = (formData.get('date_culte')  as string | null)?.trim() ?? ''
  const theme       = (formData.get('theme')        as string | null)?.trim() || null
  const predicateur = (formData.get('predicateur') as string | null)?.trim() || null

  if (!dateCulte) {
    return { error: 'La date du culte est obligatoire.' }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateCulte)) {
    return { error: 'Format de date invalide.' }
  }

  let resolvedCulteId: string

  if (culteId) {
    // Mise à jour d'un culte existant
    const culteResult = await updateCulte(culteId, { date_culte: dateCulte, theme, predicateur })
    if (culteResult.error || !culteResult.data) {
      const msg = culteResult.error ?? 'Erreur inconnue'
      if (msg.toLowerCase().includes('unique')) {
        return { error: 'Un culte existe déjà pour cette date. Choisissez une autre date.' }
      }
      return { error: `Erreur lors de la mise à jour du culte : ${msg}` }
    }
    resolvedCulteId = culteResult.data.id
  } else {
    // Création d'un nouveau culte
    const culteResult = await createCulte({ date_culte: dateCulte, theme, predicateur })
    if (culteResult.error || !culteResult.data) {
      const msg = culteResult.error ?? 'Erreur inconnue'
      if (msg.toLowerCase().includes('unique')) {
        return { error: 'Un culte existe déjà pour cette date. Choisissez une autre date.' }
      }
      return { error: `Erreur lors de la création du culte : ${msg}` }
    }
    resolvedCulteId = culteResult.data.id
  }

  // Créer l'annonce avec ses 7 rubriques
  const annonceResult = await createAnnonce(resolvedCulteId)
  if (annonceResult.error || !annonceResult.data) {
    return { error: `Erreur lors de la création de l'annonce : ${annonceResult.error ?? 'Erreur inconnue'}` }
  }

  redirect(`/annonces/${annonceResult.data.id}/rubriques`)
}
