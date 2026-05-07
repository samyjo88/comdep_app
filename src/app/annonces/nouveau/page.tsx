import { getCulteById } from '@/lib/annonces'
import { NouveauCulteForm } from './NouveauCulteForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nouveau culte' }

interface Props {
  searchParams: Promise<{ culte?: string }>
}

export default async function NouveauCultePage({ searchParams }: Props) {
  const { culte: culteId } = await searchParams

  let culteInitial: { id: string; date_culte: string; theme: string | null; predicateur: string | null } | null = null

  if (culteId) {
    const result = await getCulteById(culteId)
    if (result.data) {
      culteInitial = {
        id:          result.data.id,
        date_culte:  result.data.date_culte,
        theme:       result.data.theme ?? null,
        predicateur: result.data.predicateur ?? null,
      }
    }
  }

  return <NouveauCulteForm culteInitial={culteInitial} />
}
