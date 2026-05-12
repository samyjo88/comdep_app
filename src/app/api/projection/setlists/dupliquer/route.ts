import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export async function POST(request: Request) {
  const { unauthorized } = await requireAuth()
  if (unauthorized) return unauthorizedResponse()

  try {
    const { setlist_id, culte_id_cible, titre_setlist } = (await request.json()) as {
      setlist_id:      string
      culte_id_cible?: string | null
      titre_setlist?:  string | null
    }

    if (!setlist_id) {
      return Response.json({ error: 'setlist_id requis' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createClient() as any

    // ── Fetch original setlist + its items ──────────────────────────────────
    const { data: original, error: origErr } = await supabase
      .from('setlists')
      .select(`
        id, titre_setlist, notes,
        setlist_items(id, position, cantique_id, moment_culte, tonalite_utilisee, notes_operateur)
      `)
      .eq('id', setlist_id)
      .single()

    if (origErr || !original) {
      return Response.json(
        { error: origErr?.message ?? 'Setlist introuvable' },
        { status: 404 },
      )
    }

    // ── Create new setlist ──────────────────────────────────────────────────
    const newTitre = titre_setlist
      ?? (culte_id_cible ? null : `Copie de ${original.titre_setlist ?? 'setlist'}`)

    const { data: newSetlist, error: createErr } = await supabase
      .from('setlists')
      .insert({
        culte_id:      culte_id_cible ?? null,
        titre_setlist: newTitre,
        statut:        'brouillon',
        notes:         original.notes ?? null,
      })
      .select('id')
      .single()

    if (createErr || !newSetlist) {
      return Response.json(
        { error: createErr?.message ?? 'Erreur lors de la création' },
        { status: 500 },
      )
    }

    // ── Copy items ──────────────────────────────────────────────────────────
    const items: Row[] = original.setlist_items ?? []

    if (items.length > 0) {
      const toInsert = items.map((item: Row) => ({
        setlist_id:        newSetlist.id,
        cantique_id:       item.cantique_id,
        position:          item.position,
        moment_culte:      item.moment_culte      ?? null,
        tonalite_utilisee: item.tonalite_utilisee ?? null,
        notes_operateur:   item.notes_operateur   ?? null,
      }))

      const { error: insertErr } = await supabase
        .from('setlist_items')
        .insert(toInsert)

      if (insertErr) {
        // Rollback — delete the orphaned setlist
        await supabase.from('setlists').delete().eq('id', newSetlist.id)
        return Response.json({ error: insertErr.message }, { status: 500 })
      }
    }

    revalidatePath('/projection/setlists')
    return Response.json({ id: newSetlist.id as string, nb_items: items.length })
  } catch (err) {
    console.error('[/api/projection/setlists/dupliquer]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}
