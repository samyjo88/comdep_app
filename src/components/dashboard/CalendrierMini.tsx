'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MOIS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]
const JOURS = ['D','L','M','M','J','V','S']

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatDateCulte(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

interface Props {
  cultesDates: string[]
}

export function CalendrierMini({ cultesDates }: Props) {
  const today = new Date()
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const year  = view.getFullYear()
  const month = view.getMonth()

  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const culteSet = new Set(cultesDates.map(d => d.slice(0, 10)))

  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

  const cells: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prochains = cultesDates.filter(d => d >= todayStr).slice(0, 4)

  return (
    <div>
      {/* Navigation mois */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setView(new Date(year, month - 1, 1))}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <span className="text-xs font-semibold">{MOIS[month]} {year}</span>
        <button
          onClick={() => setView(new Date(year, month + 1, 1))}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7 gap-0.5 mb-3">
        {JOURS.map((j, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-0.5">
            {j}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`
          const isCulte  = culteSet.has(dateStr)
          const isToday  = dateStr === todayStr

          return (
            <div
              key={day}
              title={isCulte ? 'Culte planifié' : undefined}
              className={[
                'flex items-center justify-center text-[11px] rounded-full w-6 h-6 mx-auto cursor-default',
                isToday  ? 'bg-primary text-primary-foreground font-bold' : '',
                isCulte && !isToday ? 'bg-emerald-500 text-white font-semibold' : '',
                !isCulte && !isToday ? 'text-foreground hover:bg-accent' : '',
              ].join(' ')}
            >
              {day}
            </div>
          )
        })}
      </div>

      {/* Liste prochains cultes */}
      {prochains.length > 0 && (
        <div className="border-t pt-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Prochains cultes
          </p>
          {prochains.map(d => (
            <div key={d} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11px] text-foreground capitalize">
                {formatDateCulte(d)}
              </span>
            </div>
          ))}
        </div>
      )}

      {prochains.length === 0 && (
        <p className="text-[11px] text-muted-foreground italic">Aucun culte planifié</p>
      )}
    </div>
  )
}
