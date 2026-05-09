import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditClient from './EditClient'
import type { SetlistFull, LibCantique } from './EditClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Éditer la setlist' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

const SETLIST_SELECT = `
  id, statut, titre_setlist, culte_id, notes,
  cultes(id, date_culte, theme, predicateur),
  setlist_items(
    id, position, cantique_id, moment_culte, tonalite_utilisee, notes_operateur,
    cantiques(id, categorie, numero_gad, titre, tonalite, moment_culte, nb_utilisations)
  )
`.trim()

const LIB_SELECT = 'id, categorie, numero_gad, titre, tonalite, moment_culte, nb_utilisations'

async function getData(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const [setlistRes, gadRes, choraleRes, frequentsRes] = await Promise.all([
    supabase.from('setlists')
      .select(SETLIST_SELECT)
      .eq('id', id)
      .single(),
    supabase.from('cantiques')
      .select(LIB_SELECT)
      .eq('categorie', 'gad')
      .eq('actif', true)
      .order('numero_gad', { ascending: true, nullsFirst: false }),
    supabase.from('cantiques')
      .select(LIB_SELECT)
      .eq('categorie', 'chorale')
      .eq('actif', true)
      .order('titre', { ascending: true }),
    supabase.from('cantiques')
      .select(LIB_SELECT)
      .eq('actif', true)
      .gt('nb_utilisations', 0)
      .order('nb_utilisations', { ascending: false })
      .limit(20),
  ])

  if (setlistRes.error || !setlistRes.data) return null

  return {
    setlist:     (setlistRes.data as Row)    as SetlistFull,
    libGad:      ((gadRes.data      ?? []) as Row[]) as LibCantique[],
    libChorale:  ((choraleRes.data  ?? []) as Row[]) as LibCantique[],
    libFrequents: ((frequentsRes.data ?? []) as Row[]) as LibCantique[],
  }
}

export default async function SetlistEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }  = await params
  const data = await getData(id)
  if (!data) notFound()

  return (
    <EditClient
      setlist={data.setlist}
      libGad={data.libGad}
      libChorale={data.libChorale}
      libFrequents={data.libFrequents}
    />
  )
}
