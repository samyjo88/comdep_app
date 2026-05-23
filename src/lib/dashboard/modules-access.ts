import { createClient } from '@/lib/supabase/server'

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

  const [sonRes, captationRes, cmRes, annoncesRes, projRes] = await Promise.all([
    supabase.from('membres_son').select('id').eq('email', email).limit(1),
    supabase.from('membres_captation').select('id').eq('email', email).limit(1),
    supabase.from('membres_cm').select('id').eq('email', email).limit(1),
    supabase.from('membres_annonces').select('id').eq('email', email).limit(1),
    supabase.from('membres_projection').select('id').eq('email', email).limit(1),
  ])

  const modules: string[] = []
  if ((sonRes.data      ?? []).length > 0) modules.push('son')
  if ((captationRes.data ?? []).length > 0) modules.push('captation')
  if ((cmRes.data       ?? []).length > 0) modules.push('community')
  if ((annoncesRes.data  ?? []).length > 0) modules.push('annonces')
  if ((projRes.data      ?? []).length > 0) modules.push('projection')

  return modules
}
