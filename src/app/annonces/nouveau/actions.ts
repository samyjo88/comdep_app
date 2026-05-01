'use server'

import { redirect } from 'next/navigation'
import { createCulte, createAnnonce } from '@/lib/annonces'

export type NouveauCulteState =
  | { error: string }
  | { success: true; annonceId: string }

export async function preparerCulte(
  _prev: NouveauCulteState | null,
  formData: FormData,
): Promise<NouveauCulteState> {
  const dateCulte  = (formData.get('date_culte')  as string | null)?.trim() ?? ''
  const theme      = (formData.get('theme')        as string | null)?.trim() || null
  const predicateur = (formData.get('predicateur') as string | null)?.trim() || null

  if (!dateCulte) {
    return { error: 'La date du culte est obligatoire.' }
  }

  // Valider le format de la date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateCulte)) {
    return { error: 'Format de date invalide.' }
  }

  // Créer le culte
  const culteResult = await createCulte({ date_culte: dateCulte, theme, predicateur })
  if (culteResult.error || !culteResult.data) {
    const msg = culteResult.error ?? 'Erreur inconnue'
    if (msg.toLowerCase().includes('unique')) {
      return { error: 'Un culte existe déjà pour cette date. Choisissez une autre date.' }
    }
    return { error: `Erreur lors de la création du culte : ${msg}` }
  }

  // Créer l'annonce avec ses 7 rubriques
  const annonceResult = await createAnnonce(culteResult.data.id)
  if (annonceResult.error || !annonceResult.data) {
    return { error: `Erreur lors de la création de l'annonce : ${annonceResult.error ?? 'Erreur inconnue'}` }
  }

  redirect(`/annonces/${annonceResult.data.id}/rubriques`)
}
