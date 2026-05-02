import { Suspense } from 'react'
import { getPlanningByMonth, getMembresCaptation } from '@/lib/captation'
import { PlanningCaptationClient } from '@/components/captation/PlanningCaptationClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Planning' }

// ── Données ────────────────────────────────────────────────────────────────

async function PageContent({
  annee,
  mois,
}: {
  annee: number
  mois: number
}) {
  const [planningRes, membresRes] = await Promise.all([
    getPlanningByMonth(annee, mois),
    getMembresCaptation(true),
  ])

  if (planningRes.error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Erreur : {planningRes.error}
      </div>
    )
  }

  return (
    <PlanningCaptationClient
      initialPlanning={planningRes.data ?? []}
      membres={membresRes.data ?? []}
      annee={annee}
      mois={mois}
    />
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-muted" />
          <div className="h-6 w-40 rounded bg-muted" />
          <div className="h-9 w-9 rounded-md bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-md bg-muted" />
          <div className="h-9 w-36 rounded-md bg-muted" />
        </div>
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="h-40 rounded-xl bg-muted" />
      ))}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string }>
}) {
  const params = await searchParams
  const now    = new Date()
  const annee  = params.annee ? parseInt(params.annee, 10) : now.getFullYear()
  const mois   = params.mois  ? parseInt(params.mois,  10) : now.getMonth() + 1

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Planning captation</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Assignation de l&apos;équipe pour chaque culte du mois
        </p>
      </div>

      <Suspense key={`${annee}-${mois}`} fallback={<Skeleton />}>
        <PageContent annee={annee} mois={mois} />
      </Suspense>
    </div>
  )
}
