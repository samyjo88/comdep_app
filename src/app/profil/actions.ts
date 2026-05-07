'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ── Mise à jour des informations personnelles ──────────────────────────────

export async function updateProfilAction(formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const prenom    = String(formData.get('prenom')    ?? '').trim()
  const nom       = String(formData.get('nom')       ?? '').trim()
  const telephone = String(formData.get('telephone') ?? '').trim() || null

  if (!prenom || !nom) return { error: 'Le prénom et le nom sont obligatoires' }

  const { error } = await supabase
    .from('profiles')
    .update({ prenom, nom, telephone })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

// ── Activation / désactivation des notifications e-mail ───────────────────

export async function toggleEmailNotificationsAction(enabled: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('profiles')
    .update({ email_notifications: enabled })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

// ── Changement de mot de passe ─────────────────────────────────────────────

export async function changePasswordAction(formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const password = String(formData.get('password') ?? '')
  const confirm  = String(formData.get('confirm')  ?? '')

  if (password.length < 8)    return { error: 'Le mot de passe doit faire au moins 8 caractères' }
  if (password !== confirm)   return { error: 'Les mots de passe ne correspondent pas' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  return { success: true }
}

// ── Déconnexion ────────────────────────────────────────────────────────────

export async function signOutAction() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  await supabase.auth.signOut()
  redirect('/')
}
