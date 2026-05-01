import { notFound } from 'next/navigation'
import { getAnnonceAvecCulte } from '@/lib/annonces'
import RubriquesClient from './RubriquesClient'
import type { Metadata } from 'next'
import type { Culte } from '@/lib/annonces'

// ── Metadata dynamique ──────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const { data } = await getAnnonceAvecCulte(id)
  if (!data) return { title: 'Annonces' }
  const date = new Date(data.cultes.date_culte + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  return { title: `Rubriques — ${date}` }
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function RubriquesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data, error } = await getAnnonceAvecCulte(id)

  if (error || !data) notFound()

  // Trier les rubriques par ordre
  const rubriques = [...data.rubriques_annonce].sort(
    (a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Saisie des rubriques</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Remplissez chaque rubrique puis générez le texte avec l&apos;IA.
        </p>
      </div>

      <RubriquesClient
        annonceId={id}
        culte={data.cultes as Culte}
        rubriques={rubriques}
      />
    </div>
  )
}
