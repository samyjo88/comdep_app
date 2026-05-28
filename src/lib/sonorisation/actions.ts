'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { CategorieMateriel, EtatMateriel, StatutMateriel } from '@/lib/supabase/types'

// Client utilisateur (respecte le RLS)
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

// Client admin (bypass RLS) — uniquement côté serveur, jamais exposé au client
function getDbAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Vérifie que l'utilisateur est autorisé à écrire sur materiel_sono :
// soit il a le rôle responsable+, soit il est membre actif de l'équipe sono.
// Utilise le client admin pour lire membres_son sans blocage RLS.
async function canWriteMateriel(userEmail: string): Promise<boolean> {
  const admin = getDbAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('membres_son')
    .select('id')
    .ilike('email', userEmail)
    .eq('actif', true)
    .limit(1)
  return Array.isArray(data) && data.length > 0
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
  const insertData: Record<string, unknown> = {
    ...payload,
    statut: payload.statut ?? 'disponible',
    created_by: user.id,
  }
  if (insertData.date_envoi_reparation === null) delete insertData.date_envoi_reparation
  if (insertData.description_reparation === null) delete insertData.description_reparation

  // Utiliser le client admin si l'utilisateur est membre sono (son rôle global
  // peut être 'membre' qui ne passe pas la policy RLS INSERT).
  const isSono = user.email ? await canWriteMateriel(user.email) : false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = isSono ? getDbAdmin() : db

  const { error } = await client.from('materiel_sono').insert(insertData)

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
  const updateData: Record<string, unknown> = { ...payload }
  if (updateData.date_envoi_reparation === null) delete updateData.date_envoi_reparation
  if (updateData.description_reparation === null) delete updateData.description_reparation

  const isSono = user.email ? await canWriteMateriel(user.email) : false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = isSono ? getDbAdmin() : db

  const { error } = await client.from('materiel_sono').update(updateData).eq('id', id)

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

  const isSono = user.email ? await canWriteMateriel(user.email) : false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = isSono ? getDbAdmin() : db

  const { error } = await client.from('materiel_sono').update({ statut }).eq('id', id)
  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/sonorisation/inventaire')
  return { success: true }
}

// ── Supprimer un équipement ────────────────────────────────────────────────

export async function supprimerMateriel(id: number): Promise<ActionResult> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const isSono = user.email ? await canWriteMateriel(user.email) : false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = isSono ? getDbAdmin() : db

  const { error } = await client.from('materiel_sono').delete().eq('id', id)
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
