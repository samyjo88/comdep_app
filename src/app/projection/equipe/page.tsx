import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import EquipeClient from './EquipeClient'
import type { Membre, PlanningEntry } from './EquipeClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Équipe' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function getTrimestreStart(): string {
  const now     = new Date()
  const quarter = Math.floor(now.getMonth() / 3)
  return `${now.getFullYear()}-${String(quarter * 3 + 1).padStart(2, '0')}-01`
}

function getTrimestreLabel(): string {
  const now     = new Date()
  const quarter = Math.floor(now.getMonth() / 3) + 1
  return `T${quarter} ${now.getFullYear()}`
}

async function getData() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  // Fetch membres + full planning history (date filtering done client-side)
  const [membresRes, planningRes, roleRes] = await Promise.all([
    supabase.from('membres_projection')
      .select('id, nom, prenom, telephone, email, roles, actif, notes, created_at')
      .order('nom', { ascending: true }),
    supabase.from('planning_projection')
      .select('membre_id, role_du_jour, cultes(date_culte)'),
    supabase.rpc('get_my_role'),
  ])

  const trimestreStart = getTrimestreStart()

  const planning: PlanningEntry[] = ((planningRes.data ?? []) as Row[])
    .filter(p => {
      const d = p.cultes?.date_culte as string | undefined
      return d && d >= trimestreStart
    })
    .map(p => ({
      membre_id:    p.membre_id as string,
      role_du_jour: p.role_du_jour as string,
    }))

  return {
    membres:        ((membresRes.data ?? []) as Row[]) as Membre[],
    planning,
    trimestreLabel: getTrimestreLabel(),
    isAdmin:        roleRes.data === 'admin' || roleRes.data === 'super_admin',
  }
}

async function PageContent() {
  const { membres, planning, trimestreLabel, isAdmin } = await getData()
  return (
    <EquipeClient
      membres={membres}
      planning={planning}
      trimestreLabel={trimestreLabel}
      isAdmin={isAdmin}
    />
  )
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex gap-3">
        <div className="h-9 w-44 rounded-lg bg-muted" />
        <div className="flex-1" />
        <div className="h-9 w-40 rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-60 rounded-xl bg-muted" />)}
      </div>
      <div className="h-48 rounded-xl bg-muted" />
    </div>
  )
}

export default function EquipePage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Équipe</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Membres de l&apos;équipe projection &amp; Proclaim
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
