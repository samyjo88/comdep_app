import { createClient }    from '@/lib/supabase/server'
import { UserMenuClient }  from './UserMenuClient'

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  try { new URL(url); return true } catch { return false }
}

export async function UserMenu() {
  if (!isSupabaseConfigured()) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('prenom, nom')
      .eq('id', user.id)
      .single()

    const prenom    = profile?.prenom ?? ''
    const nom       = profile?.nom    ?? ''
    const initiales = `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase()
      || user.email?.[0]?.toUpperCase()
      || '?'

    return (
      <UserMenuClient
        initiales={initiales}
        prenom={prenom}
        nom={nom}
        email={user.email ?? ''}
      />
    )
  } catch {
    return null
  }
}
