'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

type MembrePayload = {
  prenom:     string
  nom:        string
  telephone?: string | null
  email?:     string | null
  roles:      string[]
  notes?:     string | null
  actif?:     boolean
}

export async function createMembreAction(payload: MembrePayload) {
  // If email is provided, send invitation
  if (payload.email) {
    const email  = payload.email.trim()
    const prenom = payload.prenom.trim()
    const nom    = payload.nom.trim()

    const admin = createAdminClient()
    const hdrs   = await headers()
    const proto  = hdrs.get('x-forwarded-proto')
    const host   = hdrs.get('host')
    const origin = hdrs.get('origin') ?? (proto && host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? ''))

    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { prenom, nom },
      redirectTo: `${origin}/auth/callback`,
    })

    if (inviteError) {
      if (!inviteError.message.toLowerCase().includes('already')) {
        return { error: inviteError.message }
      }
      // account already exists — continue
    } else {
      const userId = inviteData?.user?.id
      if (userId) {
        await admin.from('profiles').upsert({ id: userId, prenom, nom, email, actif: true })
        await admin.from('user_roles').upsert({ user_id: userId, role: 'membre' })
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase
    .from('membres_projection')
    .insert({ ...payload, actif: payload.actif ?? true })
  if (error) return { error: error.message as string }
  revalidatePath('/projection/equipe')
  return {}
}

export async function updateMembreAction(id: string, payload: Partial<MembrePayload>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase
    .from('membres_projection')
    .update(payload)
    .eq('id', id)
  if (error) return { error: error.message as string }
  revalidatePath('/projection/equipe')
  return {}
}

export async function toggleActifAction(id: string, actif: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { error } = await supabase
    .from('membres_projection')
    .update({ actif })
    .eq('id', id)
  if (error) return { error: error.message as string }
  revalidatePath('/projection/equipe')
  return {}
}
