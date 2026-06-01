import { createClient }        from '@/lib/supabase/server'
import { ResetPasswordClient } from './ResetPasswordClient'
import type { Metadata }       from 'next'

export const metadata: Metadata = { title: 'Définir votre mot de passe' }

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: { user } } = await (supabase as any).auth.getUser()

  return <ResetPasswordClient hasSession={!!user} />
}
