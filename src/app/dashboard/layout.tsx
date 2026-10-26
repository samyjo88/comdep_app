import type { ReactNode }          from 'react'
import { createClient }             from '@/lib/supabase/server'
import { CalendrierMini }           from '@/components/dashboard/CalendrierMini'

async function getCultesCalendar(): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cultesDates = await getCultesCalendar()

  return (
    <div className="flex flex-1 bg-muted/30">
      <main className="min-w-0 flex-1">{children}</main>

      {/* Calendrier des cultes, sur grand écran */}
      <aside className="hidden w-72 shrink-0 border-l bg-card px-5 py-6 2xl:block">
        <div className="sticky top-18">
          <p className="mb-3 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Calendrier des cultes
          </p>
          <CalendrierMini cultesDates={cultesDates} />
        </div>
      </aside>
    </div>
  )
}
