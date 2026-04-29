'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CategorieMateriel, EtatMateriel, StatutMateriel } from '@/lib/supabase/types'

// Client sans générique Database (compatibilité supabase-js 2.105)
async function getDb() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) => {
          try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch { /* Server Component */ }
        },
      },
    }
  )
}

// ── Types partagés ─────────────────────────────────────────────────────────

export type MaterielPayload = {
  nom: string
  categorie: CategorieMateriel
  quantite_total: number
  quantite_disponible: number
  etat: EtatMateriel
  dernier_nettoyage: string | null
  prochain_nettoyage: string | null
  en_reparation: boolean
  description_reparation: string | null
  date_envoi_reparation: string | null
  valeur_achat: number | null
  notes: string | null
  // champs optionnels
  marque?: string | null
  modele?: string | null
  reference?: string | null
  numero_serie?: string | null
  localisation?: string | null
  date_acquisition?: string | null
  statut?: StatutMateriel
}

export type ActionResult = { success: true } | { success: false; error: string }

// ── Créer un équipement ────────────────────────────────────────────────────

export async function creerMateriel(payload: MaterielPayload): Promise<ActionResult> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('materiel_sono').insert({
    ...payload,
    statut: payload.statut ?? 'disponible',
    created_by: user.id,
  })

  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/sonorisation/materiel')
  revalidatePath('/sonorisation/inventaire')
  return { success: true }
}

// ── Modifier un équipement ─────────────────────────────────────────────────

export async function modifierMateriel(id: number, payload: MaterielPayload): Promise<ActionResult> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('materiel_sono')
    .update(payload)
    .eq('id', id)

  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/sonorisation/materiel')
  revalidatePath('/sonorisation/inventaire')
  return { success: true }
}

// ── Modifier le statut ─────────────────────────────────────────────────────

export async function modifierStatutMateriel(id: number, statut: StatutMateriel): Promise<ActionResult> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('materiel_sono').update({ statut }).eq('id', id)
  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/sonorisation/inventaire')
  return { success: true }
}

// ── Supprimer un équipement ────────────────────────────────────────────────

export async function supprimerMateriel(id: number): Promise<ActionResult> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('materiel_sono').delete().eq('id', id)
  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/sonorisation/materiel')
  revalidatePath('/sonorisation/inventaire')
  return { success: true }
}

// ── Ancienne action (compatibilité avec inventaire/page.tsx) ───────────────

export type MaterielFormState = { error?: string; success?: boolean }

export async function ajouterMateriel(
  _prev: MaterielFormState,
  formData: FormData
): Promise<MaterielFormState> {
  const nom = formData.get('nom') as string
  if (!nom?.trim()) return { error: 'Le nom est obligatoire' }

  const result = await creerMateriel({
    nom: nom.trim(),
    marque:           (formData.get('marque')          as string) || null,
    modele:           (formData.get('modele')          as string) || null,
    reference:        (formData.get('reference')       as string) || null,
    numero_serie:     (formData.get('numero_serie')    as string) || null,
    categorie:        (formData.get('categorie')       as CategorieMateriel) || 'autre',
    statut:           (formData.get('statut')          as StatutMateriel)    || 'disponible',
    etat:             'bon',
    quantite_total:   1,
    quantite_disponible: 1,
    en_reparation:    false,
    description_reparation: null,
    date_envoi_reparation: null,
    localisation:     (formData.get('localisation')    as string) || null,
    date_acquisition: (formData.get('date_acquisition')as string) || null,
    valeur_achat:     formData.get('valeur_achat') ? Number(formData.get('valeur_achat')) : null,
    dernier_nettoyage: null,
    prochain_nettoyage: null,
    notes:            (formData.get('notes')           as string) || null,
  })

  if (!result.success) return { error: result.error }
  return { success: true }
}
