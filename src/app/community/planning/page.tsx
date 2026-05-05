import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getPlanningWeek, getMembresCM, getPlanningByMonth } from '@/lib/community'
import { PlanningCMClient } from '@/components/community/PlanningCMClient'
import type { MembreCM, PlanningCM } from '@/types/community'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Planning' }

// ── Helpers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function lundiCourant(): string {
  const d = new Date()
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return d.toISOString().slice(0, 10)
}

/** Tous les lundis dont la semaine chevauche le mois donné */
function lundisDuMois(annee: number, mois: number): string[] {
  const premier = new Date(annee, mois - 1, 1)
  const dernier = new Date(annee, mois, 0)
  const dow = premier.getDay()
  const lundi = new Date(premier)
  lundi.setDate(premier.getDate() - (dow === 0 ? 6 : dow - 1))

  const lundis: string[] = []
  let cur = new Date(lundi)
  while (cur <= dernier) {
    lundis.push(cur.toISOString().slice(0, 10))
    cur = new Date(cur)
    cur.setDate(cur.getDate() + 7)
  }
  return lundis
}

// ── Types partagés avec le client ─────────────────────────────────────────────

export type MonthWeekEntry = {
  planning: PlanningCM | null
  membre:   MembreCM | null
  nbPosts:  number
}

// ── PageContent ───────────────────────────────────────────────────────────────

async function PageContent({
  semaine,
  vue,
  annee,
  mois,
}: {
  semaine: string
  vue:     'semaine' | 'mois'
  annee:   number
  mois:    number
}) {
  const [weekRes, membresRes, planningMoisRes] = await Promise.all([
    getPlanningWeek(semaine),
    getMembresCM(true),
    getPlanningByMonth(annee, mois),
  ])

  if (weekRes.error)   return <Erreur message={weekRes.error} />
  if (membresRes.error) return <Erreur message={membresRes.error} />

  // ── Comptage posts par planning pour la vue mois ──────────────────────────
  const planningsRaw: Row[] = (planningMoisRes.data as Row[]) ?? []
  const planningIds = planningsRaw.map(p => p.id).filter(Boolean)
  const postCountMap: Record<string, number> = {}

  if (planningIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = await createClient() as any
    const { data: postRows } = await db
      .from('posts')
      .select('semaine_planning_id')
      .in('semaine_planning_id', planningIds)

    for (const row of (postRows ?? []) as Row[]) {
      const pid = row.semaine_planning_id
      postCountMap[pid] = (postCountMap[pid] ?? 0) + 1
    }
  }

  // ── Construction planningsMap ─────────────────────────────────────────────
  const semainesDuMois = lundisDuMois(annee, mois)
  const planningsMap: Record<string, MonthWeekEntry> = {}
  for (const sem of semainesDuMois) {
    planningsMap[sem] = { planning: null, membre: null, nbPosts: 0 }
  }
  for (const p of planningsRaw) {
    if (planningsMap[p.semaine_debut]) {
      planningsMap[p.semaine_debut] = {
        planning: p as PlanningCM,
        membre:   (p.membres_cm as MembreCM) ?? null,
        nbPosts:  postCountMap[p.id] ?? 0,
      }
    }
  }

  return (
    <PlanningCMClient
      semaine={semaine}
      vue={vue}
      planning={weekRes.data?.planning ?? null}
      membre={weekRes.data?.membre ?? null}
      posts={weekRes.data?.posts ?? []}
      membres={membresRes.data ?? []}
      annee={annee}
      mois={mois}
      semainesDuMois={semainesDuMois}
      planningsMap={planningsMap}
    />
  )
}

// ── Erreur ────────────────────────────────────────────────────────────────────

function Erreur({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
      Erreur : {message}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-muted" />
          <div className="h-5 w-52 rounded bg-muted" />
          <div className="h-9 w-9 rounded-md bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-md bg-muted" />
          <div className="h-9 w-36 rounded-md bg-muted" />
        </div>
      </div>
      <div className="h-[480px] rounded-xl bg-muted" />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PlanningCMPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string; vue?: string }>
}) {
  const params  = await searchParams
  const semaine = params.semaine ?? lundiCourant()
  const vue     = params.vue === 'mois' ? 'mois' : 'semaine'

  const d     = new Date(semaine + 'T00:00:00')
  const annee = d.getFullYear()
  const mois  = d.getMonth() + 1

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Planning CM</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Assignation et suivi hebdomadaire du Community Management
        </p>
      </div>

      <Suspense key={`${semaine}-${vue}`} fallback={<Skeleton />}>
        <PageContent semaine={semaine} vue={vue} annee={annee} mois={mois} />
      </Suspense>
    </div>
  )
}
