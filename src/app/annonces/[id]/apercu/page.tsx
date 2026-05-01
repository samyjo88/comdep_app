import { notFound } from 'next/navigation'
import { getAnnonceAvecCulte } from '@/lib/annonces'
import ApercuClient from './ApercuClient'
import type { Metadata } from 'next'
import type { Culte } from '@/lib/annonces'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const { data } = await getAnnonceAvecCulte(id)
  if (!data) return { title: 'Aperçu' }
  const date = new Date(data.cultes.date_culte + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  return { title: `Aperçu — ${date}` }
}

export default async function ApercuPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data, error } = await getAnnonceAvecCulte(id)

  if (error || !data) notFound()

  const rubriques = [...data.rubriques_annonce].sort(
    (a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <ApercuClient
        annonceId={id}
        culte={data.cultes as Culte}
        rubriques={rubriques}
        nomEglise={process.env.NEXT_PUBLIC_NOM_EGLISE ?? 'Notre Église'}
        statut={data.statut_global}
      />
    </div>
  )
}
