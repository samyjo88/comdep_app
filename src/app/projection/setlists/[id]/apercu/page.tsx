import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ApercuClient from './ApercuClient'
import type { SetlistForApercu } from './ApercuClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Aperçu setlist' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

const SETLIST_SELECT = `
  id, statut, titre_setlist,
  cultes(date_culte, theme, predicateur),
  setlist_items(
    id, position, moment_culte, tonalite_utilisee, notes_operateur,
    cantiques(id, categorie, numero_gad, titre, tonalite, paroles)
  )
`.trim()

async function getData(id: string): Promise<SetlistForApercu | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data, error } = await supabase
    .from('setlists')
    .select(SETLIST_SELECT)
    .eq('id', id)
    .single()

  if (error || !data) return null
  return (data as Row) as SetlistForApercu
}

export default async function AperçuPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const setlist = await getData(id)
  if (!setlist) notFound()

  return <ApercuClient setlist={setlist} />
}
