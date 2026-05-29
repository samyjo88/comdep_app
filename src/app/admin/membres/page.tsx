import { redirect }            from 'next/navigation'
import { Shield }               from 'lucide-react'
import { createClient }         from '@/lib/supabase/server'
import { createAdminClient }    from '@/lib/supabase/admin'
import { MembresAdminClient }   from './MembresAdminClient'
import type { Metadata }        from 'next'
import type { AppRole }         from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Gestion des membres' }

export default async function MembresAdminPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: role } = await supabase.rpc('get_my_role')

  if (role !== 'super_admin' && role !== 'admin') redirect('/dashboard')

  const admin = createAdminClient()

  // Récupère tous les profils + leurs rôles
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, prenom, nom, email, actif')
    .order('nom')

  const { data: userRoles } = await admin
    .from('user_roles')
    .select('user_id, role')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roleMap = new Map<string, AppRole>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (userRoles ?? []).map((r: any) => [r.user_id, r.role])
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membres = (profiles ?? []).map((p: any) => ({
    id:     p.id,
    prenom: p.prenom,
    nom:    p.nom,
    email:  p.email,
    role:   roleMap.get(p.id) ?? null,
    actif:  p.actif,
  }))

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/40 shrink-0">
          <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion des membres</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Inviter, gérer les rôles et désactiver des comptes</p>
        </div>
      </div>

      <MembresAdminClient membres={membres} />
    </div>
  )
}
