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
  // Calculé uniquement côté navigateur : l'heure du serveur (UTC) diffère
  // de celle de l'utilisateur, ce qui provoquait une erreur d'hydratation.
  const [target, setTarget]       = useState<Date | null>(null)
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const t = prochainDimanche9h()
    const tick = () => setRemaining(Math.max(0, t.getTime() - Date.now()))
    setTarget(t)
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  const totalSeconds = Math.floor(remaining / 1000)
  const days    = Math.floor(totalSeconds / 86400)
  const hours   = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pret    = target !== null

  const cultePlanifie = prochainCulteDate !== null

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3d6b27] via-brand-green to-[#86a93b] p-6 text-white shadow-lg shadow-primary/20 animate-rise">
      {/* Croix stylisée en filigrane */}
      <svg aria-hidden viewBox="0 0 100 140" className="pointer-events-none absolute right-6 top-1/2 h-56 -translate-y-1/2 text-white/[0.07] sm:right-1/3">
        <path fill="currentColor" d="M40 0h20v40h40v20H60v80H40V60H0V40h40z" />
      </svg>
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        {/* Compte à rebours */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-white/70" />
            <p className="text-sm font-medium text-white/80 uppercase tracking-wide">
              Prochain dimanche
            </p>
          </div>
          <p className="text-base font-semibold capitalize mb-3 text-white">
            {pret ? formatDimanche(target) : '\u00a0'}
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
                <div className="min-w-[3.25rem] rounded-xl bg-white/12 px-2 py-2 font-display text-3xl font-bold tabular-nums leading-none text-white ring-1 ring-white/15 backdrop-blur-sm">
                  {pret ? padZ(val) : '--'}
                </div>
                <div className="text-[10px] font-medium text-white/70 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Statut culte + stats */}
        <div className="flex flex-col gap-3 sm:items-end">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            cultePlanifie
              ? 'bg-white/20 text-white ring-1 ring-white/30'
              : 'bg-brand-gold/25 text-brand-gold ring-1 ring-brand-gold/40'
          }`}>
            {cultePlanifie
              ? <><CheckCircle2 className="h-3.5 w-3.5" /> Culte planifié</>
              : <><CalendarDays className="h-3.5 w-3.5" /> Non planifié</>
            }
          </div>

          <div className="flex gap-4 sm:gap-6">
            <div className="text-center">
              <p className="font-display text-2xl font-bold tabular-nums text-white">{nbMembresActifs}</p>
              <p className="text-[11px] text-white/70">Membres actifs</p>
            </div>
            <div className="text-center">
              <p className={`font-display text-2xl font-bold tabular-nums ${tachesEnAttente > 0 ? 'text-brand-gold' : 'text-white/70'}`}>
                {tachesEnAttente}
              </p>
              <p className="text-[11px] text-white/70">Tâches en attente</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
