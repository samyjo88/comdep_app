import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CulteDetailClient } from '@/components/captation/CulteDetailClient'
import type {
  MembreCaptation, PlanningAvecMembre, LivraisonCaptation, DossierDrive,
} from '@/types/captation'
import type { Metadata } from 'next'

// ── Types exportés (utilisés par CulteDetailClient) ────────────────────────

export interface CulteDetail {
  id:               string
  date_culte:       string
  theme:            string | null
  predicateur:      string | null
  statut:           string
  notes_captation:  string | null
}

// ── Metadata dynamique ─────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data } = await supabase.from('cultes').select('date_culte').eq('id', id).single()
  if (!data) return { title: 'Culte introuvable' }
  const date = new Date((data as { date_culte: string }).date_culte + 'T00:00:00')
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return { title: `Culte du ${date}` }
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function CulteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  // Toutes les requêtes en parallèle
  const [culteRes, assignmentsRes, livraisonsRes, membresRes, dossierRes] = await Promise.all([
    supabase
      .from('cultes')
      .select('id, date_culte, theme, predicateur, statut, notes_captation')
      .eq('id', id)
      .single(),
    supabase
      .from('planning_captation')
      .select('*, membres_captation(*)')
      .eq('culte_id', id),
    supabase
      .from('livraisons_captation')
      .select('*')
      .eq('culte_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('membres_captation')
      .select('*')
      .eq('actif', true)
      .order('nom', { ascending: true }),
    supabase
      .from('dossiers_drive')
      .select('*')
      .eq('culte_id', id)
      .single(),
  ])

  if (culteRes.error || !culteRes.data) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Row = Record<string, any>
  const culte       = culteRes.data       as CulteDetail
  const assignments = (assignmentsRes.data ?? [])  as PlanningAvecMembre[]
  const livraisons  = (livraisonsRes.data ?? [])   as LivraisonCaptation[]
  const membres     = (membresRes.data ?? [])       as MembreCaptation[]
  const dossier     = (dossierRes.error ? null : dossierRes.data) as DossierDrive | null

  // Membres indexés par id pour les labels dans le tableau livrables
  const membresById = Object.fromEntries(membres.map((m: Row) => [m.id, m])) as Record<string, MembreCaptation>

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <CulteDetailClient
        culte={culte}
        assignments={assignments}
        livraisons={livraisons}
        membres={membres}
        membresById={membresById}
        dossier={dossier}
      />
    </div>
  )
}
