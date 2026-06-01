'use server'

import { revalidatePath } from 'next/cache'
import { headers }        from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export type Departement = 'son' | 'captation' | 'community' | 'annonces' | 'projection'

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

  const hdrs   = await headers()
  const proto  = hdrs.get('x-forwarded-proto')
  const host   = hdrs.get('host')
  const origin = hdrs.get('origin') ?? (proto && host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? ''))

  // 1. Inviter via Supabase Auth (envoie un email avec lien de création de mot de passe)
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { prenom, nom },
    redirectTo: `${origin}/auth/callback?next=/profil/reset-password`,
  })
  if (inviteError) {
    // Si le compte existe déjà ou rate limit, on continue quand même pour la fiche équipe
    const msg = inviteError.message.toLowerCase()
    if (!msg.includes('already') && !msg.includes('rate limit')) {
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
  // Utiliser le client admin pour bypasser les RLS sur les tables de membres
  const deptClient = createAdminClient()

  let insertError: { message: string } | null = null

  if (data.departement === 'son') {
    const { error } = await deptClient.from('membres_son').insert({
      prenom,
      nom,
      email,
      telephone: data.telephone?.trim() || null,
      actif:     true,
      role:      'assistant',
    })
    insertError = error
    revalidatePath('/sonorisation/equipe')
  } else if (data.departement === 'captation') {
    const { error } = await deptClient.from('membres_captation').insert({
      prenom,
      nom,
      email,
      telephone: data.telephone?.trim() || null,
      actif:     true,
      roles:     ['cameraman'],
    })
    insertError = error
    revalidatePath('/captation/equipe')
  } else if (data.departement === 'community') {
    const { error } = await deptClient.from('membres_cm').insert({
      prenom,
      nom,
      email,
      telephone:  data.telephone?.trim() || null,
      actif:      true,
      specialites: [],
      plateformes: [],
    })
    insertError = error
    revalidatePath('/community')
  } else if (data.departement === 'annonces') {
    const { error } = await deptClient.from('membres_annonces').insert({
      prenom,
      nom,
      email,
      telephone: data.telephone?.trim() || null,
      actif:     true,
      role:      'redacteur',
    })
    insertError = error
    revalidatePath('/annonces/equipe')
  } else if (data.departement === 'projection') {
    const { error } = await deptClient.from('membres_projection').insert({
      prenom,
      nom,
      email,
      telephone: data.telephone?.trim() || null,
      actif:     true,
      roles:     ['operateur_diffusion'],
    })
    insertError = error
    revalidatePath('/projection/equipe')
  }

  if (insertError) return { error: insertError.message }

  revalidatePath('/dashboard')
  return {}
}

export interface CreerMembreAvecMotDePasseData {
  prenom:      string
  nom:         string
  email:       string
  telephone:   string | null
  departement: Departement
  password:    string
}

export async function creerMembreAvecMotDePasse(
  data: CreerMembreAvecMotDePasseData
): Promise<{ error?: string }> {
  const email    = data.email.trim()
  const prenom   = data.prenom.trim()
  const nom      = data.nom.trim()
  const password = data.password

  if (!email)    return { error: 'L\'email est obligatoire.' }
  if (!password) return { error: 'Le mot de passe est obligatoire.' }
  if (password.length < 8) return { error: 'Le mot de passe doit faire au moins 8 caractères.' }

  const admin = createAdminClient()

  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { prenom, nom },
  })

  if (createError) return { error: createError.message }

  const userId = userData.user.id

  await admin.from('profiles').upsert({ id: userId, prenom, nom, email, actif: true })
  await admin.from('user_roles').upsert({ user_id: userId, role: 'membre' })

  const deptClient = createAdminClient()
  let insertError: { message: string } | null = null

  if (data.departement === 'son') {
    const { error } = await deptClient.from('membres_son').insert({
      prenom, nom, email, telephone: data.telephone?.trim() || null, actif: true, role: 'assistant',
    })
    insertError = error
    revalidatePath('/sonorisation/equipe')
  } else if (data.departement === 'captation') {
    const { error } = await deptClient.from('membres_captation').insert({
      prenom, nom, email, telephone: data.telephone?.trim() || null, actif: true, roles: ['cameraman'],
    })
    insertError = error
    revalidatePath('/captation/equipe')
  } else if (data.departement === 'community') {
    const { error } = await deptClient.from('membres_cm').insert({
      prenom, nom, email, telephone: data.telephone?.trim() || null, actif: true, specialites: [], plateformes: [],
    })
    insertError = error
    revalidatePath('/community')
  } else if (data.departement === 'annonces') {
    const { error } = await deptClient.from('membres_annonces').insert({
      prenom, nom, email, telephone: data.telephone?.trim() || null, actif: true, role: 'redacteur',
    })
    insertError = error
    revalidatePath('/annonces/equipe')
  } else if (data.departement === 'projection') {
    const { error } = await deptClient.from('membres_projection').insert({
      prenom, nom, email, telephone: data.telephone?.trim() || null, actif: true, roles: ['operateur_diffusion'],
    })
    insertError = error
    revalidatePath('/projection/equipe')
  }

  if (insertError) return { error: insertError.message }

  revalidatePath('/dashboard')
  return {}
}
