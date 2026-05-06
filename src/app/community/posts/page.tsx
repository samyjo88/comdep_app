import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import PostsClient from './PostsClient'
import type { Metadata } from 'next'
import type { Post, MembreCM } from '@/types/community'

export const metadata: Metadata = { title: 'Posts' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function lundiDeLaSemaine(d = new Date()): string {
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const lundi = new Date(d)
  lundi.setDate(d.getDate() + diff)
  return lundi.toISOString().slice(0, 10)
}

async function getPostsData() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db      = await createClient() as any
  const semaine = lundiDeLaSemaine()

  const [planningRes, membresRes] = await Promise.all([
    db.from('planning_cm').select('*').eq('semaine_debut', semaine).maybeSingle(),
    db.from('membres_cm').select('*').eq('actif', true).order('nom'),
  ])

  const planning   = planningRes.data as Row | null
  const membres    = (membresRes.data ?? []) as MembreCM[]
  const planningId = planning?.id ?? null

  let posts: Post[] = []
  if (planningId) {
    const { data } = await db
      .from('posts')
      .select('*')
      .eq('semaine_planning_id', planningId)
      .order('date_publication_prevue', { ascending: true })
    posts = data ?? []
  }

  return { posts, membres, planningId }
}

async function PageContent() {
  const { posts, membres, planningId } = await getPostsData()
  return (
    <PostsClient
      posts={posts}
      membres={membres}
      planningId={planningId}
    />
  )
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} className="h-7 w-16 rounded-md bg-muted" />)}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 sm:h-12 rounded-lg bg-muted" />)}
      </div>
    </div>
  )
}

export default function PostsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Gérez les posts de la semaine en cours
        </p>
      </div>
      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
