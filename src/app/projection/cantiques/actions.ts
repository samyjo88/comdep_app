'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CantiquePayload = Record<string, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

const SEARCH_SELECT = [
  'id', 'categorie', 'numero_gad', 'titre', 'sous_titre',
  'auteur_compositeur', 'tonalite', 'tempo', 'paroles',
  'lien_partition', 'lien_audio', 'themes', 'moment_culte',
  'difficulte', 'occasion', 'actif', 'nb_utilisations',
  'created_at', 'notes',
].join(', ')

export async function searchCantiquesAction(query: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const q = query.trim()
  if (!q) return { gad: [] as Row[], chorale: [] as Row[] }

  const isNum = /^\d/.test(q)

  const [ftsRes, fallbackRes] = await Promise.all([
    supabase.from('cantiques')
      .select(SEARCH_SELECT)
      .textSearch('titre', q, { type: 'websearch', config: 'french' })
      .limit(30),
    supabase.from('cantiques')
      .select(SEARCH_SELECT)
      .or(`numero_gad.ilike.%${q}%,auteur_compositeur.ilike.%${q}%`)
      .limit(15),
  ])

  // Merge & dedupe
  const seen = new Set<string>()
  const all = [...(ftsRes.data ?? []), ...(fallbackRes.data ?? [])].filter((c: Row) => {
    if (seen.has(c.id as string)) return false
    seen.add(c.id as string)
    return true
  })

  // Relevance scoring
  function score(c: Row): number {
    if (isNum) {
      if (c.numero_gad === q)               return 4
      if ((c.numero_gad ?? '').startsWith(q)) return 3
      if ((c.numero_gad ?? '').includes(q))  return 2
    }
    const titre = (c.titre as string ?? '').toLowerCase()
    const ql    = q.toLowerCase()
    if (titre === ql)            return 3
    if (titre.startsWith(ql))   return 2
    if (titre.includes(ql))     return 1
    return 0
  }

  all.sort((a: Row, b: Row) => {
    const sd = score(b) - score(a)
    return sd !== 0 ? sd : (b.nb_utilisations as number) - (a.nb_utilisations as number)
  })

  return {
    gad:    all.filter((c: Row) => c.categorie === 'gad'),
    chorale: all.filter((c: Row) => c.categorie === 'chorale'),
  }
}

export async function createCantiqueAction(payload: CantiquePayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase.from('cantiques').insert(payload)
  if (error) return { error: error.message }
  revalidatePath('/projection/cantiques')
  return {}
}

export async function updateCantiqueAction(id: string, payload: CantiquePayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase.from('cantiques').update(payload).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/projection/cantiques')
  revalidatePath(`/projection/cantiques/${id}`)
  return {}
}

export async function deleteCantiqueAction(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase.from('cantiques').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/projection/cantiques')
  return {}
}
