import { redirect }        from 'next/navigation'
import { createClient }    from '@/lib/supabase/server'
import { ProfilClient }    from './ProfilClient'
import type { Metadata }   from 'next'
import type { AppRole }    from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Mon profil – ComDept' }

// ── Détection des modules ──────────────────────────────────────────────────

async function detectModules(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  email: string,
): Promise<{ key: string; label: string }[]> {
  const modules: { key: string; label: string }[] = []

  const [sonRes, captationRes, cmRes] = await Promise.all([
    supabase
      .from('membres_son')
      .select('id')
      .eq('email', email)
      .eq('actif', true)
      .limit(1),
    supabase
      .from('membres_captation')
      .select('id')
      .eq('email', email)
      .eq('actif', true)
      .limit(1),
    supabase
      .from('membres_cm')
      .select('id')
      .eq('email', email)
      .eq('actif', true)
      .limit(1),
  ])

  if ((sonRes.data ?? []).length > 0)       modules.push({ key: 'son',       label: 'Sonorisation'         })
  if ((captationRes.data ?? []).length > 0) modules.push({ key: 'captation', label: 'Captation Vidéo'      })
  if ((cmRes.data ?? []).length > 0)        modules.push({ key: 'cm',        label: 'Community Management' })

  return modules
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function ProfilPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [profileRes, roleRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, prenom, nom, email, telephone, avatar_url, bio, actif, email_notifications, created_at, updated_at')
      .eq('id', user.id)
      .single(),
    supabase.rpc('get_my_role'),
  ])

  const profile = profileRes.data
  if (!profile) redirect('/')

  const role:    AppRole = roleRes.data ?? 'membre'
  const email:   string  = user.email ?? profile.email
  const modules           = await detectModules(supabase, email)

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Mon profil</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Gérez vos informations personnelles et vos préférences
        </p>
      </div>

      <ProfilClient
        profile={profile}
        role={role}
        modules={modules}
        email={email}
      />
    </div>
  )
}
