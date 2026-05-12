import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import PlanningClient from './PlanningClient'
import type { CulteForPlanning, MembreBrief } from './PlanningClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Planning' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function parseMonthParam(mois: string | undefined): { year: number; month: number } {
  if (mois && /^\d{4}-\d{2}$/.test(mois)) {
    const [y, m] = mois.split('-').map(Number)
    if (m >= 1 && m <= 12) return { year: y, month: m }
  }
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

async function getData(year: number, month: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const monthStr  = String(month).padStart(2, '0')
  const dateStart = `${year}-${monthStr}-01`
  const lastDay   = new Date(year, month, 0).getDate()
  const dateEnd   = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`

  const [cultesRes, membresRes] = await Promise.all([
    supabase
      .from('cultes')
      .select(`
        id, date_culte, theme, predicateur, statut,
        planning_projection(
          id, role_du_jour, statut, notes,
          membres_projection(id, prenom, nom)
        ),
        setlists(id, statut, titre_setlist, setlist_items(id))
      `)
      .gte('date_culte', dateStart)
      .lte('date_culte', dateEnd)
      .order('date_culte', { ascending: true }),
    supabase
      .from('membres_projection')
      .select('id, prenom, nom, roles')
      .eq('actif', true)
      .order('nom', { ascending: true }),
  ])

  return {
    cultes:  ((cultesRes.data  ?? []) as Row[]) as CulteForPlanning[],
    membres: ((membresRes.data ?? []) as Row[]) as MembreBrief[],
  }
}

async function PageContent({ year, month }: { year: number; month: number }) {
  const { cultes, membres } = await getData(year, month)
  return (
    <PlanningClient
      cultes={cultes}
      membres={membres}
      year={year}
      month={month}
    />
  )
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted" />
        <div className="h-7 w-40 rounded bg-muted" />
        <div className="h-9 w-9 rounded-lg bg-muted" />
        <div className="flex-1" />
        <div className="h-9 w-24 rounded-lg bg-muted" />
        <div className="h-9 w-36 rounded-lg bg-muted" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="h-40 rounded-xl bg-muted" />
      ))}
    </div>
  )
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>
}) {
  const { mois } = await searchParams
  const { year, month } = parseMonthParam(mois)

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Planning</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Planification mensuelle des opérateurs projection
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent year={year} month={month} />
      </Suspense>
    </div>
  )
}
