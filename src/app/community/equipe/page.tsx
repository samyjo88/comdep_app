import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { EquipeCMClient } from '@/components/community/EquipeCMClient'
import type { MembreCM } from '@/types/community'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Équipe CM' }

// ── Helpers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function bornesTrimestreActuel(): { debut: string; fin: string; label: string } {
  const now       = new Date()
  const annee     = now.getFullYear()
  const trim      = Math.floor(now.getMonth() / 3)
  const moisDebut = trim * 3
  const moisFin   = moisDebut + 2
  const derJour   = new Date(annee, moisFin + 1, 0).getDate()
  const pad       = (n: number) => String(n + 1).padStart(2, '0')

  return {
    debut: `${annee}-${pad(moisDebut)}-01`,
    fin:   `${annee}-${pad(moisFin)}-${String(derJour).padStart(2, '0')}`,
    label: `T${trim + 1} ${annee}`,
  }
}

// ── Types stats exportés pour le client ──────────────────────────────────────

export type StatsMembreCM = {
  semGerrees:   number
  postsCrees:   number
  postsPublies: number
}

export type StatsParMembreCM = Record<string, StatsMembreCM>

// ── PageContent ───────────────────────────────────────────────────────────────

async function PageContent() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = await createClient() as any
  const { debut, fin, label: trimestreLabel } = bornesTrimestreActuel()

  const [membresRes, planningRes, postsRes] = await Promise.all([
    db.from('membres_cm').select('*').order('nom', { ascending: true }),
    db
      .from('planning_cm')
      .select('membre_id')
      .gte('semaine_debut', debut)
      .lte('semaine_debut', fin)
      .not('membre_id', 'is', null),
    db
      .from('posts')
      .select('assignee_id, statut')
      .gte('created_at', debut + 'T00:00:00')
      .lte('created_at', fin + 'T23:59:59')
      .not('assignee_id', 'is', null),
  ])

  if (membresRes.error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Erreur : {(membresRes.error as { message: string }).message}
      </div>
    )
  }

  const membres = (membresRes.data ?? []) as MembreCM[]

  // ── Stats : semaines gérées par membre ───────────────────────────────────
  const semsParMembre = ((planningRes.data ?? []) as Row[]).reduce<Record<string, number>>(
    (acc, row) => { acc[row.membre_id] = (acc[row.membre_id] ?? 0) + 1; return acc },
    {},
  )

  // ── Stats : posts créés / publiés par assignee ───────────────────────────
  const postsParMembre = ((postsRes.data ?? []) as Row[]).reduce<
    Record<string, { crees: number; publies: number }>
  >((acc, row) => {
    const id = row.assignee_id
    if (!acc[id]) acc[id] = { crees: 0, publies: 0 }
    acc[id].crees++
    if (row.statut === 'publie') acc[id].publies++
    return acc
  }, {})

  // ── Fusion dans StatsParMembreCM ─────────────────────────────────────────
  const statsParMembre: StatsParMembreCM = {}
  for (const m of membres) {
    statsParMembre[m.id] = {
      semGerrees:   semsParMembre[m.id]          ?? 0,
      postsCrees:   postsParMembre[m.id]?.crees  ?? 0,
      postsPublies: postsParMembre[m.id]?.publies ?? 0,
    }
  }

  return (
    <EquipeCMClient
      membres={membres}
      statsParMembre={statsParMembre}
      trimestreLabel={trimestreLabel}
    />
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-10 w-80 rounded-lg bg-muted" />
        <div className="h-9 w-40 rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-48 rounded-xl bg-muted" />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EquipeCMPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Équipe Community Management</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Gestion des membres et suivi de participation
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
