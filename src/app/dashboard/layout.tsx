import type { ReactNode }   from 'react'
import { createClient }      from '@/lib/supabase/server'
import { DashboardSidebar }  from '@/components/dashboard/DashboardSidebar'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCultesCalendar(): Promise<string[]> {
  const supabase = await createClient() as any
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('planning_son')
    .select('date_culte')
    .gte('date_culte', today)
    .neq('statut', 'passe')
    .order('date_culte', { ascending: true })
    .limit(16)
  return (data ?? []).map((r: { date_culte: string }) => r.date_culte)
}

async function getModulesAccessibles(): Promise<string[] | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: roleData } = await supabase.rpc('get_my_role')
  const role = roleData as string | null

  // Admins and responsables see everything
  if (!role || (role !== 'membre' && role !== 'redacteur')) return null

  const email = user.email as string | undefined
  if (!email) return []

  const modules: string[] = []

  const checks = await Promise.all([
    supabase.from('membres_son').select('id').eq('email', email).limit(1),
    supabase.from('membres_captation').select('id').eq('email', email).limit(1),
    supabase.from('membres_cm').select('id').eq('email', email).limit(1),
    supabase.from('membres_annonces').select('id').eq('email', email).limit(1),
    supabase.from('membres_projection').select('id').eq('email', email).limit(1),
  ])

  const moduleKeys = ['son', 'captation', 'community', 'annonces', 'projection']
  checks.forEach(({ data }, i) => {
    if (data && data.length > 0) modules.push(moduleKeys[i])
  })

  return modules
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const [cultesDates, modulesAccessibles] = await Promise.all([
    getCultesCalendar(),
    getModulesAccessibles(),
  ])

  return (
    <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 3rem)' }}>
      <DashboardSidebar cultesDates={cultesDates} modulesAccessibles={modulesAccessibles} />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        {children}
      </main>
    </div>
  )
}
