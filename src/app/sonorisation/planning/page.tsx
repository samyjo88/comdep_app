import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { PlanningClient } from '@/components/sonorisation/PlanningClient'
import { CalendarDays } from 'lucide-react'
import type { PlanningCulte, MembreSon } from '@/lib/supabase/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Planning sonorisation',
}

// ── Données ────────────────────────────────────────────────────────────────

async function PageContent() {
  const supabase = await createClient()

  const [planningsRes, membresRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('planning_son')
      .select('*')
      .order('date_culte', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('membres_son')
      .select('*')
      .eq('actif', true)
      .order('nom', { ascending: true }),
  ])

  if (planningsRes.error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Erreur : {(planningsRes.error as { message: string }).message}
      </div>
    )
  }

  const plannings = (planningsRes.data ?? []) as PlanningCulte[]
  const membres   = (membresRes.data  ?? []) as MembreSon[]

  return <PlanningClient plannings={plannings} membres={membres} />
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-52 rounded-lg bg-muted" />
          <div className="h-5 w-40 rounded bg-muted" />
        </div>
        <div className="h-9 w-36 rounded-md bg-muted" />
      </div>
      <div className="h-80 rounded-xl bg-muted" />
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-6 max-w-7xl">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0 mt-0.5">
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planning sonorisation</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Organisation hebdomadaire des cultes et assignation des membres
          </p>
        </div>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
