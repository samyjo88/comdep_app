'use server'

import { revalidatePath } from 'next/cache'
import { headers }        from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import type { AppRole }      from '@/lib/supabase/types'

async function assertSuperAdmin() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'super_admin') throw new Error('Accès refusé')
}

export async function inviteMemberAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await assertSuperAdmin()
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
      redirectTo: `${origin}/auth/callback`,
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
    await assertSuperAdmin()
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
    await assertSuperAdmin()
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
    await assertSuperAdmin()
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
    await assertSuperAdmin()
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
    await assertSuperAdmin()
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
