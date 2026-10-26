import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getEquipesDisponibles } from '@/lib/cultes'
import { getModulesAccessibles } from '@/lib/dashboard/modules-access'
import { ProgrammerCulteForm } from './ProgrammerCulteForm'

export const metadata = { title: 'Programmer un culte' }

export default async function NouveauCultePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const [equipes, modules, { date }] = await Promise.all([
    getEquipesDisponibles(),
    getModulesAccessibles(),
    searchParams,
  ])
  const peut = (m: string) => modules === null || modules.includes(m)

  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-7 sm:px-5">
      <div>
        <Link href="/cultes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />Programme des cultes
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Programmer un culte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dimanche ou culte en semaine : le culte est créé une seule fois et apparaît dans tous les modules.
        </p>
      </div>

      <ProgrammerCulteForm
        equipes={equipes}
        dateInitiale={date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined}
        acces={{
          annonces:   peut('annonces'),
          son:        peut('son'),
          captation:  peut('captation'),
          projection: peut('projection'),
        }}
      />
    </div>
  )
}
