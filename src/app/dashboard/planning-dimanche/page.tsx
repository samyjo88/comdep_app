import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getProchainsDimanches, getAssignations, getMembresParDepartement,
} from '@/lib/dashboard/planning-dimanche'
import { PlanningDimancheClient } from '@/components/dashboard/PlanningDimancheClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Planning du dimanche' }

// ── Données ────────────────────────────────────────────────────────────────

async function PageContent() {
  const dimanches = getProchainsDimanches()
  const [assignationsRes, membres] = await Promise.all([
    getAssignations(dimanches[0], dimanches[dimanches.length - 1]),
    getMembresParDepartement(),
  ])

  if (assignationsRes.error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Erreur : {assignationsRes.error}
      </div>
    )
  }

  return (
    <PlanningDimancheClient
      dimanches={dimanches}
      initialAssignations={assignationsRes.data ?? []}
      membres={membres}
    />
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex gap-2">
        <div className="h-9 w-36 rounded-md bg-muted" />
        <div className="h-9 w-40 rounded-md bg-muted" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="h-48 rounded-xl bg-muted" />
      ))}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function PlanningDimanchePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="container mx-auto py-7 px-5 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Planning du dimanche</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Membres de service par département pour chaque dimanche
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
