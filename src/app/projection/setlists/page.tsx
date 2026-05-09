import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import SetlistsClient from './SetlistsClient'
import type { Setlist, Culte } from './SetlistsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Setlists' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

const SETLIST_SELECT = `
  id, statut, titre_setlist, culte_id, notes, created_at,
  cultes(id, date_culte, theme, predicateur),
  setlist_items(id, position, cantiques(id, categorie, numero_gad, titre))
`.trim()

async function getData() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const today    = new Date().toISOString().slice(0, 10)

  const [setlistsRes, cultesRes] = await Promise.all([
    supabase.from('setlists')
      .select(SETLIST_SELECT)
      .order('created_at', { ascending: false }),
    supabase.from('cultes')
      .select('id, date_culte, theme, predicateur')
      .gte('date_culte', today)
      .order('date_culte', { ascending: true })
      .limit(20),
  ])

  return {
    setlists:        ((setlistsRes.data ?? []) as Row[]) as Setlist[],
    prochainsCultes: ((cultesRes.data  ?? []) as Row[]) as Culte[],
  }
}

async function PageContent() {
  const { setlists, prochainsCultes } = await getData()
  return <SetlistsClient setlists={setlists} prochainsCultes={prochainsCultes} />
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-3 mb-6">
        <div className="h-9 w-44 rounded-lg bg-muted" />
        <div className="flex-1" />
        <div className="h-9 w-64 rounded-lg bg-muted" />
        <div className="h-9 w-40 rounded-lg bg-muted" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="h-52 rounded-xl bg-muted" />
      ))}
    </div>
  )
}

export default function SetlistsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Setlists</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Gestion des setlists de culte
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
