'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { RoleCaptation } from '@/types/captation'

export type ActionResult = { success: true } | { success: false; error: string }

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
  prenom:    string
  nom:       string
  telephone: string | null
  email:     string | null
  roles:     RoleCaptation[]
  notes:     string | null
}

// ── creerMembreCaptationAction ─────────────────────────────────────────────

export async function creerMembreCaptationAction(
  payload: MembrePayload,
): Promise<ActionResult> {
  try {
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
        redirectTo: `${origin}/auth/callback?next=/profil/reset-password`,
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

    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('membres_captation')
      .insert({ ...payload, actif: true })

    if (error) return { success: false, error: (error as { message: string }).message }

    revalidatePath('/captation/equipe')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── modifierMembreCaptationAction ──────────────────────────────────────────

export async function modifierMembreCaptationAction(
  id:      string,
  payload: MembrePayload,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('membres_captation')
      .update(payload)
      .eq('id', id)

    if (error) return { success: false, error: (error as { message: string }).message }

    revalidatePath('/captation/equipe')
    revalidatePath('/captation/planning')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── toggleActifMembreCaptationAction ──────────────────────────────────────

export async function toggleActifMembreCaptationAction(
  id:    string,
  actif: boolean,
): Promise<ActionResult> {
  try {
    const db = await getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from('membres_captation')
      .update({ actif })
      .eq('id', id)

    if (error) return { success: false, error: (error as { message: string }).message }

    revalidatePath('/captation/equipe')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── supprimerMembreCaptationAction ─────────────────────────────────────────

export async function supprimerMembreCaptationAction(id: string): Promise<ActionResult> {
  try {
    const db = await getDb()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return { success: false, error: 'Non authentifié' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: role } = await (db as any).rpc('get_my_role')
    if (role !== 'admin' && role !== 'super_admin') {
      return { success: false, error: 'Accès refusé : seuls les administrateurs peuvent supprimer des membres' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any).from('membres_captation').delete().eq('id', id)
    if (error) return { success: false, error: (error as { message: string }).message }

    revalidatePath('/captation/equipe')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
