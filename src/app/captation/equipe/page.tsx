import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { EquipeCaptationClient } from '@/components/captation/EquipeCaptationClient'
import type { MembreCaptation, RoleCaptation, StatsParMembre } from '@/types/captation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Équipe' }

// ── Helpers trimestre ──────────────────────────────────────────────────────

function bornesTrimestreActuel(): { debut: string; fin: string; label: string } {
  const now        = new Date()
  const annee      = now.getFullYear()
  const trimestre  = Math.floor(now.getMonth() / 3)
  const moisDebut  = trimestre * 3
  const moisFin    = moisDebut + 2
  const derJour    = new Date(annee, moisFin + 1, 0).getDate()
  const pad        = (n: number) => String(n + 1).padStart(2, '0')
  const labels     = ['T1', 'T2', 'T3', 'T4']

  return {
    debut: `${annee}-${pad(moisDebut)}-01`,
    fin:   `${annee}-${pad(moisFin)}-${String(derJour).padStart(2, '0')}`,
    label: `${labels[trimestre]} ${annee}`,
  }
}

// ── Données ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

async function PageContent() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { debut, fin, label: trimestreLabel } = bornesTrimestreActuel()

  const [membresRes, cultesRes] = await Promise.all([
    supabase.from('membres_captation').select('*').order('nom', { ascending: true }),
    supabase.from('cultes').select('id').gte('date_culte', debut).lte('date_culte', fin),
  ])

  if (membresRes.error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Erreur : {(membresRes.error as { message: string }).message}
      </div>
    )
  }

  const membres = (membresRes.data ?? []) as MembreCaptation[]

  // Assignments du trimestre (via les cultes du trimestre)
  const culteIds: string[] = (cultesRes.data ?? []).map((c: Row) => c.id)
  let statsParMembre: StatsParMembre = {}

  if (culteIds.length > 0) {
    const { data: assignmentsData } = await supabase
      .from('planning_captation')
      .select('membre_id, role_du_jour')
      .in('culte_id', culteIds)

    statsParMembre = ((assignmentsData ?? []) as Row[]).reduce<StatsParMembre>((acc, row) => {
      const id   = row.membre_id as string
      const role = row.role_du_jour as RoleCaptation
      if (!acc[id]) acc[id] = { cameraman: 0, photographe: 0, infographiste: 0, total: 0 }
      acc[id][role]++
      acc[id].total++
      return acc
    }, {})
  }

  return (
    <EquipeCaptationClient
      membres={membres}
      statsParMembre={statsParMembre}
      trimestreLabel={trimestreLabel}
    />
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-10 w-80 rounded-lg bg-muted" />
        <div className="h-9 w-40 rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-muted" />
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function EquipePage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Équipe captation</h1>
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
