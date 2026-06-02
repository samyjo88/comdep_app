'use server'

import { revalidatePath } from 'next/cache'
import { headers }        from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import type { AppRole }      from '@/lib/supabase/types'

async function assertAdmin() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'super_admin' && role !== 'admin') throw new Error('Accès refusé')
}

export async function inviteMemberAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const email      = (formData.get('email')      as string).trim()
    const prenom     = (formData.get('prenom')     as string).trim()
    const nom        = (formData.get('nom')        as string).trim()
    const role       = (formData.get('role')       as AppRole) || 'membre'

    const admin = createAdminClient()
    const hdrs   = await headers()
    const proto  = hdrs.get('x-forwarded-proto')
    const host   = hdrs.get('host')
    const origin = hdrs.get('origin') ?? (proto && host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? ''))
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { prenom, nom },
      redirectTo: `${origin}/auth/callback?next=/profil/reset-password`,
    })
    if (error) {
      const msg = error.message.toLowerCase()
      if (!msg.includes('already') && !msg.includes('rate limit')) {
        return { error: error.message }
      }
      // account already exists or rate limited — profile/role already exist, skip
    } else {
      // Créer le profil et le rôle
      const userId = data.user.id
      await admin.from('profiles').upsert({ id: userId, prenom, nom, email, actif: true })
      await admin.from('user_roles').upsert({ user_id: userId, role })
    }

    revalidatePath('/admin/membres')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function updateRoleAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const userId = formData.get('userId') as string
    const role   = formData.get('role')   as AppRole

    const admin = createAdminClient()
    const { error } = await admin.from('user_roles').upsert({ user_id: userId, role })
    if (error) return { error: error.message }

    revalidatePath('/admin/membres')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function disableMemberAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const userId = formData.get('userId') as string

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: '876600h' })
    if (error) return { error: error.message }

    await admin.from('profiles').update({ actif: false }).eq('id', userId)

    revalidatePath('/admin/membres')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function enableMemberAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const userId = formData.get('userId') as string

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
    if (error) return { error: error.message }

    await admin.from('profiles').update({ actif: true }).eq('id', userId)

    revalidatePath('/admin/membres')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function resetPasswordAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const email = formData.get('email') as string

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createClient() as any
    const hdrs   = await headers()
    const proto  = hdrs.get('x-forwarded-proto')
    const host   = hdrs.get('host')
    const origin = hdrs.get('origin') ?? (proto && host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? ''))
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/profil/reset-password`,
    })
    if (error) return { error: error.message }

    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function deleteMembreAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const userId = formData.get('userId') as string
    const email  = formData.get('email')  as string

    const admin = createAdminClient()

    // Supprimer des tables département (par email)
    await Promise.all([
      admin.from('membres_son').delete().eq('email', email),
      admin.from('membres_captation').delete().eq('email', email),
      admin.from('membres_cm').delete().eq('email', email),
      admin.from('membres_annonces').delete().eq('email', email),
      admin.from('membres_projection').delete().eq('email', email),
    ])

    // Supprimer le rôle et le profil
    await admin.from('user_roles').delete().eq('user_id', userId)
    await admin.from('profiles').delete().eq('id', userId)

    // Supprimer le compte Supabase Auth (irréversible)
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return { error: error.message }

    revalidatePath('/admin/membres')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export type Departement = 'son' | 'captation' | 'community' | 'annonces' | 'projection'

export async function getDepartementsAction(
  email: string
): Promise<{ departements?: Departement[]; error?: string }> {
  try {
    await assertAdmin()
    const admin = createAdminClient()

    const [sonRes, captRes, cmRes, annRes, projRes] = await Promise.all([
      admin.from('membres_son').select('id').eq('email', email).limit(1),
      admin.from('membres_captation').select('id').eq('email', email).limit(1),
      admin.from('membres_cm').select('id').eq('email', email).limit(1),
      admin.from('membres_annonces').select('id').eq('email', email).limit(1),
      admin.from('membres_projection').select('id').eq('email', email).limit(1),
    ])

    const departements: Departement[] = []
    if ((sonRes.data  ?? []).length > 0) departements.push('son')
    if ((captRes.data ?? []).length > 0) departements.push('captation')
    if ((cmRes.data   ?? []).length > 0) departements.push('community')
    if ((annRes.data  ?? []).length > 0) departements.push('annonces')
    if ((projRes.data ?? []).length > 0) departements.push('projection')

    return { departements }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function setDepartementsAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const email            = formData.get('email') as string
    const prenom           = formData.get('prenom') as string
    const nom              = formData.get('nom') as string
    const departementsRaw  = formData.get('departements') as string
    const departements     = JSON.parse(departementsRaw) as Departement[]

    const admin = createAdminClient()

    // Retirer des départements non sélectionnés
    if (!departements.includes('son'))        await admin.from('membres_son').delete().eq('email', email)
    if (!departements.includes('captation'))  await admin.from('membres_captation').delete().eq('email', email)
    if (!departements.includes('community'))  await admin.from('membres_cm').delete().eq('email', email)
    if (!departements.includes('annonces'))   await admin.from('membres_annonces').delete().eq('email', email)
    if (!departements.includes('projection')) await admin.from('membres_projection').delete().eq('email', email)

    // Ajouter dans les départements sélectionnés (uniquement si pas déjà présent)
    if (departements.includes('son')) {
      const { data } = await admin.from('membres_son').select('id').eq('email', email).limit(1)
      if (!data?.length) await admin.from('membres_son').insert({ prenom, nom, email, actif: true, role: 'assistant' })
    }
    if (departements.includes('captation')) {
      const { data } = await admin.from('membres_captation').select('id').eq('email', email).limit(1)
      if (!data?.length) await admin.from('membres_captation').insert({ prenom, nom, email, actif: true, roles: ['cameraman'] })
    }
    if (departements.includes('community')) {
      const { data } = await admin.from('membres_cm').select('id').eq('email', email).limit(1)
      if (!data?.length) await admin.from('membres_cm').insert({ prenom, nom, email, actif: true, specialites: [], plateformes: [] })
    }
    if (departements.includes('annonces')) {
      const { data } = await admin.from('membres_annonces').select('id').eq('email', email).limit(1)
      if (!data?.length) await admin.from('membres_annonces').insert({ prenom, nom, email, actif: true, role: 'redacteur' })
    }
    if (departements.includes('projection')) {
      const { data } = await admin.from('membres_projection').select('id').eq('email', email).limit(1)
      if (!data?.length) await admin.from('membres_projection').insert({ prenom, nom, email, actif: true, roles: ['operateur_diffusion'] })
    }

    revalidatePath('/admin/membres')
    revalidatePath('/dashboard')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}
