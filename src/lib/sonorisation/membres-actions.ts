'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import type { RoleSon } from '@/lib/supabase/types'

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

export type MembrePayload = {
  prenom: string
  nom: string
  telephone: string | null
  email: string | null
  role: RoleSon
}

export type ActionResult = { success: true } | { success: false; error: string }

export async function creerMembre(payload: MembrePayload): Promise<ActionResult> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

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
      const msg = inviteError.message.toLowerCase()
      if (!msg.includes('already') && !msg.includes('rate limit')) {
        return { success: false, error: inviteError.message }
      }
      // account already exists or rate limited — continue
    } else {
      const userId = inviteData?.user?.id
      if (userId) {
        await admin.from('profiles').upsert({ id: userId, prenom, nom, email, actif: true })
        await admin.from('user_roles').upsert({ user_id: userId, role: 'membre' })
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('membres_son').insert({
    ...payload,
    actif: true,
    created_by: user.id,
  })

  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/sonorisation/equipe')
  return { success: true }
}

export async function modifierMembre(id: number, payload: MembrePayload): Promise<ActionResult> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('membres_son').update(payload).eq('id', id)
  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/sonorisation/equipe')
  return { success: true }
}

export async function modifierActiveMembre(id: number, actif: boolean): Promise<ActionResult> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('membres_son').update({ actif }).eq('id', id)
  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/sonorisation/equipe')
  return { success: true }
}

export async function supprimerMembre(id: number): Promise<ActionResult> {
  const db = await getDb()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from('membres_son').delete().eq('id', id)
  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/sonorisation/equipe')
  return { success: true }
}
