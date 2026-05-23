'use server'

import { redirect } from 'next/navigation'
import { headers }  from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function loginAction(formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const email    = formData.get('email')    as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const params = new URLSearchParams({ error: error.message })
    redirect(`/login?${params}`)
  }

  redirect('/dashboard')
}

export async function forgotPasswordAction(formData: FormData): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const email    = (formData.get('email') as string).trim()

  const hdrs   = await headers()
  const proto  = hdrs.get('x-forwarded-proto')
  const host   = hdrs.get('host')
  const origin = hdrs.get('origin') ?? (proto && host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? ''))

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/profil/reset-password`,
  })

  if (error) return { error: error.message }
  return {}
}
