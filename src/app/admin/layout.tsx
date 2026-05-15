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

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cultesDates = await getCultesCalendar()

  return (
    <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 3rem)' }}>
      <DashboardSidebar cultesDates={cultesDates} />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        {children}
      </main>
    </div>
  )
}
