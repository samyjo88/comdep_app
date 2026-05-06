import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import PlanningClient from './PlanningClient'
import type { Metadata } from 'next'
import type { MembreCM, PlanningCM, Post } from '@/types/community'

export const metadata: Metadata = { title: 'Planning' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function lundiDeLaSemaine(d = new Date()): string {
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const lundi = new Date(d)
  lundi.setDate(d.getDate() + diff)
  return lundi.toISOString().slice(0, 10)
}

async function getPlanningData(semaine: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = await createClient() as any

  const [planningRes, membresRes] = await Promise.all([
    db.from('planning_cm').select('*, membres_cm(*)').eq('semaine_debut', semaine).maybeSingle(),
    db.from('membres_cm').select('*').eq('actif', true).order('nom'),
  ])

  const planning = planningRes.data as (Row & { membres_cm?: MembreCM }) | null
  const membres  = (membresRes.data ?? []) as MembreCM[]

  let posts: Post[] = []
  if (planning?.id) {
    const { data } = await db
      .from('posts')
      .select('*')
      .eq('semaine_planning_id', planning.id)
      .order('date_publication_prevue', { ascending: true })
    posts = data ?? []
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { membres_cm: _mc, ...planningRow } = planning ?? {}

  return {
    planning:  planning ? planningRow as unknown as PlanningCM : null,
    membre:    planning?.membres_cm ?? null,
    membres,
    posts,
  }
}

async function PageContent({ semaine }: { semaine: string }) {
  const { planning, membre, membres, posts } = await getPlanningData(semaine)
  return (
    <PlanningClient
      semaine={semaine}
      planning={planning}
      membre={membre}
      membres={membres}
      posts={posts}
    />
  )
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 rounded-xl bg-muted" />
      <div className="h-32 rounded-xl bg-muted" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-muted" />)}
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-muted" />)}
      </div>
    </div>
  )
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>
}) {
  const params  = await searchParams
  const semaine = params.semaine && /^\d{4}-\d{2}-\d{2}$/.test(params.semaine)
    ? params.semaine
    : lundiDeLaSemaine()

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl space-y-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Planning</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Assignez un CM responsable et gérez les posts par semaine
        </p>
      </div>
      <Suspense fallback={<Skeleton />}>
        <PageContent semaine={semaine} />
      </Suspense>
    </div>
  )
}
