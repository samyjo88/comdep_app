'use server'

import { updateRubrique, getAnnonceAvecCulte } from '@/lib/annonces'
import type { StatutReconduite } from '@/types/annonces'

export async function sauvegarderStatutReconduite(
  rubriqueId: string,
  statut: StatutReconduite,
): Promise<{ error?: string }> {
  const result = await updateRubrique(rubriqueId, { reconduire: statut })
  if (result.error) return { error: result.error }
  return {}
}

export async function sauvegarderDateValidite(
  rubriqueId: string,
  date: string | null,
): Promise<{ error?: string }> {
  const result = await updateRubrique(rubriqueId, { date_validite: date || null })
  if (result.error) return { error: result.error }
  return {}
}

export async function appliquerReconductes(
  annoncePrecedenteId: string,
  annonceProchainId: string,
): Promise<{ error?: string }> {
  const [precRes, prochRes] = await Promise.all([
    getAnnonceAvecCulte(annoncePrecedenteId),
    getAnnonceAvecCulte(annonceProchainId),
  ])

  if (precRes.error || !precRes.data)  return { error: 'Annonce précédente introuvable' }
  if (prochRes.error || !prochRes.data) return { error: 'Annonce suivante introuvable' }

  const prochRubriques = prochRes.data.rubriques_annonce

  for (const rub of precRes.data.rubriques_annonce) {
    if (rub.reconduire === 'a_definir' || rub.reconduire === 'non') continue

    const cible = prochRubriques.find(r => r.code_rubrique === rub.code_rubrique)
    if (!cible) continue

    if (rub.reconduire === 'oui') {
      await updateRubrique(cible.id, {
        texte_final:    rub.texte_final,
        donnees_brutes: rub.donnees_brutes,
      })
    } else if (rub.reconduire === 'modifier') {
      // Pré-remplir les données uniquement — l'utilisateur modifiera le texte
      await updateRubrique(cible.id, {
        donnees_brutes: rub.donnees_brutes,
      })
    }
  }

  return {}
}
