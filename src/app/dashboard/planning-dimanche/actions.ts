'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Departement, Slot } from '@/types/planning-dimanche'

export type ActionResult = { success: true } | { success: false; error: string }

async function getDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, user: null }
  return { supabase, user }
}

function revalidate() {
  revalidatePath('/dashboard/planning-dimanche')
  revalidatePath('/dashboard')
}

// ── Assigner / retirer un membre sur une place ──────────────────────────────

export async function assignerMembre(
  dateDimanche: string,
  departement:  Departement,
  slot:         Slot,
  membreId:     string | null,
): Promise<ActionResult> {
  const { supabase, user } = await getDb()
  if (!user) return { success: false, error: 'Non authentifié' }

  if (!membreId) {
    const { error } = await supabase
      .from('planning_dimanche')
      .delete()
      .eq('date_dimanche', dateDimanche)
      .eq('departement', departement)
      .eq('slot', slot)
    if (error) return { success: false, error: (error as { message: string }).message }
    revalidate()
    return { success: true }
  }

  // Empêcher d'assigner la même personne sur les deux places du même dimanche
  const { data: existants } = await supabase
    .from('planning_dimanche')
    .select('id, slot')
    .eq('date_dimanche', dateDimanche)
    .eq('departement', departement)
    .eq('membre_id', membreId)
    .neq('slot', slot)
  if ((existants ?? []).length > 0) {
    return { success: false, error: 'Ce membre est déjà de service ce dimanche.' }
  }

  const { error } = await supabase
    .from('planning_dimanche')
    .upsert(
      {
        date_dimanche: dateDimanche,
        departement,
        slot,
        membre_id:  membreId,
        created_by: user.id,
      },
      { onConflict: 'date_dimanche,departement,slot' },
    )
  if (error) return { success: false, error: (error as { message: string }).message }

  revalidate()
  return { success: true }
}

// ── Permuter / déplacer une place (absence, indisponibilité) ────────────────
//
// Échange le membre d'une assignation avec celui d'une autre place du même
// département (autre dimanche ou autre slot). Si la place cible est vide,
// l'assignation y est simplement déplacée.

export async function permuterAssignation(
  assignationId: number,
  cibleDate:     string,
  cibleSlot:     Slot,
): Promise<ActionResult> {
  const { supabase, user } = await getDb()
  if (!user) return { success: false, error: 'Non authentifié' }

  const { data: source, error: errSource } = await supabase
    .from('planning_dimanche')
    .select('id, date_dimanche, departement, slot, membre_id')
    .eq('id', assignationId)
    .maybeSingle()
  if (errSource) return { success: false, error: (errSource as { message: string }).message }
  if (!source)   return { success: false, error: 'Assignation introuvable.' }

  if (source.date_dimanche === cibleDate && source.slot === cibleSlot) {
    return { success: false, error: 'La place cible est identique à la place actuelle.' }
  }

  const { data: cible, error: errCible } = await supabase
    .from('planning_dimanche')
    .select('id, membre_id')
    .eq('date_dimanche', cibleDate)
    .eq('departement', source.departement)
    .eq('slot', cibleSlot)
    .maybeSingle()
  if (errCible) return { success: false, error: (errCible as { message: string }).message }

  // Garde : la permutation ne doit pas mettre deux fois le même membre
  // de service le même dimanche (sur l'autre place du département).
  const autreSlotCible = cibleSlot === 1 ? 2 : 1
  const { data: voisinCible } = await supabase
    .from('planning_dimanche')
    .select('id, membre_id')
    .eq('date_dimanche', cibleDate)
    .eq('departement', source.departement)
    .eq('slot', autreSlotCible)
    .maybeSingle()
  if (voisinCible && voisinCible.id !== source.id && voisinCible.membre_id === source.membre_id) {
    return { success: false, error: 'Ce membre est déjà de service sur le dimanche cible.' }
  }
  if (cible) {
    const autreSlotSource = source.slot === 1 ? 2 : 1
    const { data: voisinSource } = await supabase
      .from('planning_dimanche')
      .select('id, membre_id')
      .eq('date_dimanche', source.date_dimanche)
      .eq('departement', source.departement)
      .eq('slot', autreSlotSource)
      .maybeSingle()
    if (voisinSource && voisinSource.id !== cible.id && voisinSource.membre_id === cible.membre_id) {
      return { success: false, error: 'Le membre de la place cible est déjà de service sur le dimanche actuel.' }
    }
  }

  if (cible) {
    // Échange des membres entre les deux places
    const { error: e1 } = await supabase
      .from('planning_dimanche')
      .update({ membre_id: cible.membre_id })
      .eq('id', source.id)
    if (e1) return { success: false, error: (e1 as { message: string }).message }

    const { error: e2 } = await supabase
      .from('planning_dimanche')
      .update({ membre_id: source.membre_id })
      .eq('id', cible.id)
    if (e2) return { success: false, error: (e2 as { message: string }).message }
  } else {
    // Place cible vide : simple déplacement
    const { error } = await supabase
      .from('planning_dimanche')
      .update({ date_dimanche: cibleDate, slot: cibleSlot })
      .eq('id', source.id)
    if (error) return { success: false, error: (error as { message: string }).message }
  }

  revalidate()
  return { success: true }
}
