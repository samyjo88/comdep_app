import { getHistoriqueAnnonces } from '@/lib/annonces'
import HistoriqueClient from './HistoriqueClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Historique des annonces' }

export default async function HistoriquePage() {
  const { data: cultes } = await getHistoriqueAnnonces()

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Historique des annonces</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Archives de tous les cultes passés.
        </p>
      </div>

      <HistoriqueClient cultes={cultes ?? []} />
    </div>
  )
}
