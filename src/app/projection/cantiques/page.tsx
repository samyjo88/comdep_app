import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import CantiquesClient from './CantiquesClient'
import type { Cantique } from './CantiquesClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Cantiques' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

const SELECT_FIELDS = [
  'id', 'categorie', 'numero_gad', 'titre', 'sous_titre',
  'auteur_compositeur', 'tonalite', 'tempo', 'paroles',
  'lien_partition', 'lien_audio', 'themes', 'moment_culte',
  'difficulte', 'occasion', 'actif', 'nb_utilisations',
  'created_at', 'notes',
].join(', ')

async function getCantiques() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const [gadRes, choraleRes] = await Promise.all([
    supabase.from('cantiques')
      .select(SELECT_FIELDS)
      .eq('categorie', 'gad')
      .order('numero_gad', { ascending: true, nullsFirst: false }),
    supabase.from('cantiques')
      .select(SELECT_FIELDS)
      .eq('categorie', 'chorale')
      .order('titre', { ascending: true }),
  ])

  return {
    gad:    ((gadRes.data    ?? []) as Row[]) as Cantique[],
    chorale: ((choraleRes.data ?? []) as Row[]) as Cantique[],
  }
}

async function PageContent() {
  const { gad, chorale } = await getCantiques()
  return <CantiquesClient gad={gad} chorale={chorale} />
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Tabs */}
      <div className="flex gap-2">
        <div className="h-10 w-44 rounded-xl bg-muted" />
        <div className="h-10 w-52 rounded-xl bg-muted" />
      </div>
      {/* Search + sort */}
      <div className="flex gap-2">
        <div className="flex-1 h-9 rounded-lg bg-muted" />
        <div className="w-44 h-9 rounded-lg bg-muted" />
      </div>
      {/* Chips */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="h-7 w-20 rounded-full bg-muted" />
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-44 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  )
}

export default function CantiquesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Cantiques</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Base de données unifiée — GAD &amp; Répertoire Chorale
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
