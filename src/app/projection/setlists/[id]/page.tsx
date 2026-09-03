import { redirect } from 'next/navigation'

/**
 * /projection/setlists/[id]
 *
 * La setlist n'a pas de vue propre : l'aperçu imprimable
 * (/projection/setlists/[id]/apercu) fait office de page de consultation.
 * Cette redirection garde valides les liens et favoris déjà partagés.
 * Un identifiant inconnu retombe sur le notFound() de la page d'aperçu.
 */
export default async function SetlistPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/projection/setlists/${id}/apercu`)
}
