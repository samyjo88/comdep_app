import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { IdeesCMClient } from '@/components/community/IdeesCMClient'
import type { IdeaContenu, MembreCM } from '@/types/community'
import type { Culte } from '@/types/annonces'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Idées CM' }

// ── PageContent ───────────────────────────────────────────────────────────────

async function PageContent() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = await createClient() as any

  const dateMin = new Date()
  dateMin.setDate(dateMin.getDate() - 7)
  const dateMax = new Date()
  dateMax.setDate(dateMax.getDate() + 90)

  const [ideesRes, membresRes, cultesRes] = await Promise.all([
    db
      .from('idees_contenu')
      .select('*')
      .order('created_at', { ascending: false }),
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

  if (ideesRes.error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Erreur : {(ideesRes.error as { message: string }).message}
      </div>
    )
  }

  const idees   = (ideesRes.data   ?? []) as IdeaContenu[]
  const membres = (membresRes.data ?? []) as MembreCM[]
  const cultes  = (cultesRes.data  ?? []) as Culte[]

  return (
    <IdeesCMClient
      idees={idees}
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
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-28 rounded-full bg-muted" />
          ))}
        </div>
        <div className="h-9 w-44 rounded-md bg-muted" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-muted" />
        ))}
      </div>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-52 rounded-xl bg-muted break-inside-avoid" />
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IdeesCMPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Idées de contenu</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Banque d'idées pour les prochaines publications
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
