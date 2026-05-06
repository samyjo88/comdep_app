import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import RapportsClient from './RapportsClient'
import type { Metadata } from 'next'
import type { RapportCM } from '@/types/community'

export const metadata: Metadata = { title: 'Rapports' }

function lundiDeLaSemaine(d = new Date()): string {
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const lundi = new Date(d)
  lundi.setDate(d.getDate() + diff)
  return lundi.toISOString().slice(0, 10)
}

async function getRapports() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = await createClient() as any
  const { data } = await db
    .from('rapports_cm')
    .select('*')
    .order('semaine_debut', { ascending: false })
    .limit(10)
  return (data ?? []) as RapportCM[]
}

async function PageContent() {
  const rapports    = await getRapports()
  const semaineDebut = lundiDeLaSemaine()
  return <RapportsClient rapports={rapports} semaineDebut={semaineDebut} />
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-28 rounded-xl bg-muted" />
      <div className="h-6 w-40 rounded bg-muted" />
      {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-muted" />)}
    </div>
  )
}

export default function RapportsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl space-y-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Rapports</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Rapports hebdomadaires générés par l&apos;IA
        </p>
      </div>
      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
