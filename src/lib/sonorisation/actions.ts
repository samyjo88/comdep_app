'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CategorieMateriel, StatutMateriel } from '@/lib/supabase/types'

// Client sans générique Database pour les mutations — évite les conflits de types
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

export type MaterielFormState = {
  error?: string
  success?: boolean
}

export async function ajouterMateriel(
  _prev: MaterielFormState,
  formData: FormData
): Promise<MaterielFormState> {
  const db = await getDb()

  const { data: { user } } = await db.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const nom = formData.get('nom') as string
  if (!nom?.trim()) return { error: 'Le nom est obligatoire' }

  const row = {
    nom:              nom.trim(),
    marque:           (formData.get('marque')          as string) || null,
    modele:           (formData.get('modele')          as string) || null,
    reference:        (formData.get('reference')       as string) || null,
    numero_serie:     (formData.get('numero_serie')    as string) || null,
    categorie:        (formData.get('categorie')       as CategorieMateriel) || 'autre',
    statut:           (formData.get('statut')          as StatutMateriel)    || 'disponible',
    localisation:     (formData.get('localisation')    as string) || null,
    date_acquisition: (formData.get('date_acquisition')as string) || null,
    valeur_achat:     formData.get('valeur_achat') ? Number(formData.get('valeur_achat')) : null,
    notes:            (formData.get('notes')           as string) || null,
    created_by:       user.id,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('materiel_sono').insert(row)
  if (error) return { error: (error as { message: string }).message }

  revalidatePath('/sonorisation/inventaire')
  return { success: true }
}

export async function modifierStatutMateriel(
  id: number,
  statut: StatutMateriel
): Promise<{ error?: string }> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('materiel_sono').update({ statut }).eq('id', id)
  if (error) return { error: (error as { message: string }).message }

  revalidatePath('/sonorisation/inventaire')
  return {}
}

export async function supprimerMateriel(id: number): Promise<{ error?: string }> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('materiel_sono').delete().eq('id', id)
  if (error) return { error: (error as { message: string }).message }

  revalidatePath('/sonorisation/inventaire')
  return {}
}
