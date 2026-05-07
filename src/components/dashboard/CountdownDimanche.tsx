'use client'

import { useEffect, useState } from 'react'
import { Clock, CalendarDays, CheckCircle2 } from 'lucide-react'

function prochainDimanche9h(): Date {
  const now = new Date()
  const day = now.getDay() // 0 = dim
  const daysUntil = day === 0 ? 7 : 7 - day
  const sunday = new Date(now)
  sunday.setDate(now.getDate() + daysUntil)
  sunday.setHours(9, 0, 0, 0)
  return sunday
}

function formatDimanche(d: Date): string {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function padZ(n: number) {
  return String(n).padStart(2, '0')
}

interface Props {
  prochainCulteDate: string | null // ISO date "2026-05-10"
  nbMembresActifs:   number
  tachesEnAttente:   number
}

export function CountdownDimanche({ prochainCulteDate, nbMembresActifs, tachesEnAttente }: Props) {
  const target = prochainDimanche9h()
  const [remaining, setRemaining] = useState<number>(() => Math.max(0, target.getTime() - Date.now()))

  useEffect(() => {
    const t = prochainDimanche9h()
    const interval = setInterval(() => {
      setRemaining(Math.max(0, t.getTime() - Date.now()))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const totalSeconds = Math.floor(remaining / 1000)
  const days    = Math.floor(totalSeconds / 86400)
  const hours   = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const cultePlanifie = prochainCulteDate !== null

  return (
    <div className="rounded-2xl bg-emerald-800 dark:bg-emerald-900 text-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        {/* Compte à rebours */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-emerald-300" />
            <p className="text-sm font-medium text-emerald-200 uppercase tracking-wide">
              Prochain dimanche
            </p>
          </div>
          <p className="text-base font-semibold capitalize mb-3 text-emerald-100">
            {formatDimanche(target)}
          </p>
          {/* Timer */}
          <div className="flex items-end gap-3">
            {[
              { val: days,    label: 'J' },
              { val: hours,   label: 'H' },
              { val: minutes, label: 'MIN' },
              { val: seconds, label: 'SEC' },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-black tabular-nums leading-none text-white">
                  {padZ(val)}
                </div>
                <div className="text-[10px] font-medium text-emerald-300 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Statut culte + stats */}
        <div className="flex flex-col gap-3 sm:items-end">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            cultePlanifie
              ? 'bg-emerald-600/60 text-emerald-100'
              : 'bg-amber-500/30 text-amber-200'
          }`}>
            {cultePlanifie
              ? <><CheckCircle2 className="h-3.5 w-3.5" /> Culte planifié</>
              : <><CalendarDays className="h-3.5 w-3.5" /> Non planifié</>
            }
          </div>

          <div className="flex gap-4 sm:gap-6">
            <div className="text-center">
              <p className="text-2xl font-black tabular-nums text-white">{nbMembresActifs}</p>
              <p className="text-[11px] text-emerald-300">Membres actifs</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-black tabular-nums ${tachesEnAttente > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                {tachesEnAttente}
              </p>
              <p className="text-[11px] text-emerald-300">Tâches en attente</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
