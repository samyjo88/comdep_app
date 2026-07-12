import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailIlikePattern } from '@/lib/email'

export async function getMyRole(): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: role } = await supabase.rpc('get_my_role')
  return (role as string | null) ?? null
}

export async function getModulesAccessibles(): Promise<string[] | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: roleData } = await supabase.rpc('get_my_role')
  const role = roleData as string | null

  // null = voir tout (admin, super_admin, responsable, rôle inconnu)
  if (!role || (role !== 'membre' && role !== 'redacteur')) return null

  const email = user.email as string | undefined
  if (!email) return []

  // Utiliser le client admin pour bypasser les RLS et lire les tables de membres.
  // Correspondance insensible à la casse : Supabase Auth stocke l'email en
  // minuscules alors que les fiches équipe peuvent contenir une casse mixte.
  const admin = createAdminClient()
  const pattern = emailIlikePattern(email)

  const [sonRes, captationRes, cmRes, annoncesRes, projRes] = await Promise.all([
    admin.from('membres_son').select('id').ilike('email', pattern).limit(1),
    admin.from('membres_captation').select('id').ilike('email', pattern).limit(1),
    admin.from('membres_cm').select('id').ilike('email', pattern).limit(1),
    admin.from('membres_annonces').select('id').ilike('email', pattern).limit(1),
    admin.from('membres_projection').select('id').ilike('email', pattern).limit(1),
  ])

  const modules: string[] = []
  if ((sonRes.data      ?? []).length > 0) modules.push('son')
  if ((captationRes.data ?? []).length > 0) modules.push('captation')
  if ((cmRes.data       ?? []).length > 0) modules.push('community')
  if ((annoncesRes.data  ?? []).length > 0) modules.push('annonces')
  if ((projRes.data      ?? []).length > 0) modules.push('projection')

  return modules
}
