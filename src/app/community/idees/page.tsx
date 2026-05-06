import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import IdeesClient from './IdeesClient'
import type { Metadata } from 'next'
import type { IdeaContenu } from '@/types/community'

export const metadata: Metadata = { title: 'Idées' }

async function getIdees() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = await createClient() as any
  const { data } = await db
    .from('idees_contenu')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []) as IdeaContenu[]
}

async function PageContent() {
  const idees = await getIdees()
  return <IdeesClient idees={idees} />
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-9 w-40 rounded-md bg-muted" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 rounded-xl bg-muted" />)}
      </div>
    </div>
  )
}

export default function IdeesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Idées de contenu</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Gérez les idées de posts pour les réseaux sociaux
        </p>
      </div>
      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
