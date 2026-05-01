import { getAnnoncePrecedente, getCultesAvenir } from '@/lib/annonces'
import SuiviClient from './SuiviClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Suivi des reconductes' }

export default async function SuiviPage() {
  const [precedenteResult, avenirResult] = await Promise.all([
    getAnnoncePrecedente(),
    getCultesAvenir(),
  ])

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Suivi des reconductes</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Décidez rubrique par rubrique ce qui doit être reconduit, modifié ou supprimé.
        </p>
      </div>

      <SuiviClient
        cultePrecedent={precedenteResult.data}
        cultesAvenir={avenirResult.data ?? []}
      />
    </div>
  )
}
