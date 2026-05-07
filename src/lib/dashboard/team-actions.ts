'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type Departement = 'son' | 'captation' | 'community'

export interface AjouterMembreData {
  prenom:      string
  nom:         string
  email:       string        // obligatoire pour l'invitation
  telephone:   string | null
  departement: Departement
}

export async function ajouterMembre(data: AjouterMembreData): Promise<{ error?: string }> {
  const email  = data.email.trim()
  const prenom = data.prenom.trim()
  const nom    = data.nom.trim()

  if (!email) return { error: 'L\'email est obligatoire pour envoyer l\'invitation.' }

  const admin = createAdminClient()

  // 1. Inviter via Supabase Auth (envoie un email avec lien de création de mot de passe)
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { prenom, nom },
  })
  if (inviteError) {
    // Si le compte existe déjà, on continue quand même pour la fiche équipe
    if (!inviteError.message.toLowerCase().includes('already')) {
      return { error: inviteError.message }
    }
  }

  // 2. Créer / mettre à jour le profil
  const userId = inviteData?.user?.id
  if (userId) {
    await admin.from('profiles').upsert({
      id:    userId,
      prenom,
      nom,
      email,
      actif: true,
    })

    // 3. Attribuer le rôle "membre"
    await admin.from('user_roles').upsert({ user_id: userId, role: 'membre' })
  }

  // 4. Ajouter à la table département (fiche équipe pour les plannings)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const table =
    data.departement === 'son'       ? 'membres_son'      :
    data.departement === 'captation' ? 'membres_captation' :
    'membres_cm'

  const { error: insertError } = await supabase.from(table).insert({
    prenom,
    nom,
    email,
    telephone: data.telephone?.trim() || null,
    actif:     true,
    role:      'assistant',
  })

  if (insertError) return { error: insertError.message }

  revalidatePath('/dashboard')
  return {}
}
