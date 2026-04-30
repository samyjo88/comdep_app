import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { EquipeClient } from '@/components/sonorisation/EquipeClient'
import { Users } from 'lucide-react'
import type { MembreSon } from '@/lib/supabase/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Équipe sonorisation',
}

// ── Fetch + render ─────────────────────────────────────────────────────────

async function PageContent() {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawMembres, error } = await (supabase as any)
    .from('membres_son')
    .select('*')
    .order('nom', { ascending: true })

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Erreur de chargement : {(error as { message: string }).message}
      </div>
    )
  }

  const membres = (rawMembres ?? []) as MembreSon[]

  return <EquipeClient membres={membres} />
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Barre filtre + bouton */}
      <div className="flex items-center justify-between">
        <div className="h-10 w-56 rounded-lg bg-muted" />
        <div className="h-9 w-36 rounded-md bg-muted" />
      </div>
      {/* Cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-52 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function EquipePage() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-6 max-w-6xl">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0 mt-0.5">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Équipe sonorisation</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Gestion des membres de l&apos;équipe technique
          </p>
        </div>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
