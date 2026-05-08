import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DetailClient } from './DetailClient'
import type { Cantique } from '../CantiquesClient'
import type { Metadata } from 'next'

// ── Types ──────────────────────────────────────────────────────────────────

export type SetlistRef = {
  id:            string
  titre_setlist: string | null
  statut:        string
  date_culte:    string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

const SELECT_FIELDS = [
  'id', 'categorie', 'numero_gad', 'titre', 'sous_titre',
  'auteur_compositeur', 'tonalite', 'tempo', 'paroles',
  'lien_partition', 'lien_audio', 'themes', 'moment_culte',
  'difficulte', 'occasion', 'actif', 'nb_utilisations',
  'derniere_utilisation', 'created_at', 'updated_at', 'notes',
].join(', ')

// ── generateMetadata ───────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data } = await supabase
    .from('cantiques')
    .select('titre, numero_gad, categorie')
    .eq('id', id)
    .single()
  if (!data) return { title: 'Cantique introuvable' }
  const row = data as Row
  const label = row.categorie === 'gad' && row.numero_gad
    ? `GAD ${row.numero_gad} · ${row.titre}`
    : row.titre
  return { title: label }
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function CantiquesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }   = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const [cantiqueRes, setlistItemsRes] = await Promise.all([
    supabase
      .from('cantiques')
      .select(SELECT_FIELDS)
      .eq('id', id)
      .single(),
    supabase
      .from('setlist_items')
      .select('id, setlist_id, setlists(id, titre_setlist, statut, cultes(date_culte))')
      .eq('cantique_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (cantiqueRes.error || !cantiqueRes.data) notFound()

  const cantique = cantiqueRes.data as Cantique

  const setlists: SetlistRef[] = ((setlistItemsRes.data ?? []) as Row[])
    .map((item: Row) => ({
      id:            item.setlists?.id ?? item.setlist_id,
      titre_setlist: item.setlists?.titre_setlist ?? null,
      statut:        item.setlists?.statut ?? 'brouillon',
      date_culte:    item.setlists?.cultes?.date_culte ?? null,
    }))
    .filter((s: SetlistRef) => s.date_culte)
    .sort((a: SetlistRef, b: SetlistRef) =>
      (b.date_culte ?? '').localeCompare(a.date_culte ?? ''),
    )
    .slice(0, 5)

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <DetailClient cantique={cantique} setlists={setlists} />
    </div>
  )
}
