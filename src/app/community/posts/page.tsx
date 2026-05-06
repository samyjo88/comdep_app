import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { PostsClient } from '@/components/community/PostsClient'
import type { Post, MembreCM, PlanningCM } from '@/types/community'
import type { Culte } from '@/types/annonces'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Posts CM' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function lundiDeSemaine(dateStr: string): string {
  const d   = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return d.toISOString().slice(0, 10)
}

function lundiSemaineActuelle(): string {
  return lundiDeSemaine(new Date().toISOString().slice(0, 10))
}

// ── PageContent ───────────────────────────────────────────────────────────────

async function PageContent({
  semaine,
  vue,
}: {
  semaine: string
  vue:     string
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = await createClient() as any

  // Fetch cultes from 4 weeks ago to 12 weeks ahead (relevant window for post planning)
  const dateMin = new Date(semaine + 'T12:00:00')
  dateMin.setDate(dateMin.getDate() - 28)
  const dateMax = new Date(semaine + 'T12:00:00')
  dateMax.setDate(dateMax.getDate() + 84)

  const [planningRes, membresRes, cultesRes] = await Promise.all([
    db
      .from('planning_cm')
      .select('*')
      .eq('semaine_debut', semaine)
      .maybeSingle(),
    db
      .from('membres_cm')
      .select('*')
      .eq('actif', true)
      .order('nom', { ascending: true }),
    db
      .from('cultes')
      .select('id, date_culte, theme, predicateur, statut')
      .gte('date_culte', dateMin.toISOString().slice(0, 10))
      .lte('date_culte', dateMax.toISOString().slice(0, 10))
      .order('date_culte', { ascending: true }),
  ])

  const planning = (planningRes.data ?? null) as PlanningCM | null
  const membres  = (membresRes.data ?? []) as MembreCM[]
  const cultes   = (cultesRes.data ?? []) as Culte[]

  // Fetch posts — either by planning id or by week date range
  let posts: Post[] = []
  if (planning?.id) {
    const { data } = await db
      .from('posts')
      .select('*')
      .eq('semaine_planning_id', planning.id)
      .order('date_publication_prevue', { ascending: true, nullsFirst: false })
    posts = (data ?? []) as Post[]
  } else {
    // Planning row doesn't exist yet — fetch by date range to handle orphan posts
    const fin = new Date(semaine + 'T12:00:00')
    fin.setDate(fin.getDate() + 6)
    const { data } = await db
      .from('posts')
      .select('*')
      .gte('date_publication_prevue', semaine + 'T00:00:00')
      .lte('date_publication_prevue', fin.toISOString().slice(0, 10) + 'T23:59:59')
      .order('date_publication_prevue', { ascending: true, nullsFirst: false })
    posts = (data ?? []) as Post[]
  }

  return (
    <PostsClient
      semaine={semaine}
      vue={vue as 'tableau' | 'kanban'}
      planning={planning}
      posts={posts}
      membres={membres}
      cultes={cultes}
    />
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-9 w-72 rounded-md bg-muted" />
        <div className="flex gap-2">
          <div className="h-9 w-32 rounded-md bg-muted" />
          <div className="h-9 w-28 rounded-md bg-muted" />
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-muted" />
        ))}
      </div>
      <div className="h-96 rounded-xl bg-muted" />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PostsCMPage({ searchParams }: PageProps) {
  const params  = await searchParams
  const semaine = typeof params.semaine === 'string'
    ? lundiDeSemaine(params.semaine)
    : lundiSemaineActuelle()
  const vue = typeof params.vue === 'string' && params.vue === 'kanban'
    ? 'kanban'
    : 'tableau'

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Suivi et gestion des publications
        </p>
      </div>

      <Suspense fallback={<Skeleton />} key={`${semaine}-${vue}`}>
        <PageContent semaine={semaine} vue={vue} />
      </Suspense>
    </div>
  )
}
