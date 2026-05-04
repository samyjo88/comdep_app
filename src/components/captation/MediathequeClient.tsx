'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, HardDrive, FolderOpen, FolderX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { DossierDriveCard } from '@/components/captation/DossierDriveCard'
import type { DossierDrive } from '@/types/captation'
import type { CulteAvecDossier } from '@/app/captation/mediatheque/page'

// ── Helpers ────────────────────────────────────────────────────────────────

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function formatDateLongue(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function capitalize(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1) }

function formatMb(mb: number): string {
  if (mb < 1)     return `${Math.round(mb * 1024)} Ko`
  if (mb < 1024)  return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  cultes: CulteAvecDossier[]
  annee:  number
  mois:   number
  stats: {
    nbCrees:     number
    nbTotal:     number
    espaceTotal: number
  }
}

// ── Composant ──────────────────────────────────────────────────────────────

export function MediathequeClient({ cultes: initial, annee, mois, stats: initialStats }: Props) {
  const router = useRouter()
  const [cultes, setCultes] = useState<CulteAvecDossier[]>(initial)
  const [stats,  setStats]  = useState(initialStats)

  // Navigation entre mois
  function naviguerMois(delta: number) {
    let m = mois + delta
    let a = annee
    if (m > 12) { m = 1;  a++ }
    if (m < 1)  { m = 12; a-- }
    router.push(`/captation/mediatheque?annee=${a}&mois=${m}`)
  }

  // Mise à jour optimiste d'un dossier après création ou synchro
  const handleDossierUpdate = useCallback((culteId: string, dossier: DossierDrive) => {
    setCultes(prev => prev.map(c => c.id === culteId ? { ...c, dossier } : c))
    setStats(prev => {
      const wasCreated = initial.find(c => c.id === culteId)?.dossier !== null
      const nbCrees    = wasCreated ? prev.nbCrees : prev.nbCrees + 1
      const espaceTotal = cultes.reduce((acc, c) => {
        if (c.id === culteId) return acc + (dossier.espace_utilise_mb ?? 0)
        return acc + (c.dossier?.espace_utilise_mb ?? 0)
      }, 0)
      return { ...prev, nbCrees, espaceTotal }
    })
  }, [cultes, initial])

  const nbManquants = stats.nbTotal - stats.nbCrees

  return (
    <div className="space-y-6">

      {/* Navigation mois */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => naviguerMois(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold flex-1 text-center">
          {MOIS_NOMS[mois - 1]} {annee}
        </h2>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => naviguerMois(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Barre de stats globale */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 shrink-0">
                <HardDrive className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Espace utilisé</p>
                <p className="text-xl font-bold">
                  {stats.espaceTotal > 0 ? formatMb(stats.espaceTotal) : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950 shrink-0">
                <FolderOpen className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dossiers créés</p>
                <p className="text-xl font-bold">
                  {stats.nbCrees}
                  <span className="text-sm font-normal text-muted-foreground ml-1">/ {stats.nbTotal}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
                nbManquants > 0 ? 'bg-amber-50 dark:bg-amber-950' : 'bg-muted',
              )}>
                <FolderX className={cn('h-5 w-5', nbManquants > 0 ? 'text-amber-500' : 'text-muted-foreground')} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sans dossier</p>
                <p className={cn('text-xl font-bold', nbManquants > 0 ? 'text-amber-600' : '')}>
                  {nbManquants}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des cultes */}
      {cultes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-xl border border-dashed text-center">
          <HardDrive className="h-10 w-10 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">Aucun culte ce mois-ci</p>
        </div>
      ) : (
        <div className="space-y-6">
          {cultes.map(culte => (
            <div key={culte.id} className="space-y-3">
              {/* En-tête culte */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-semibold text-sm truncate">
                    {capitalize(formatDateLongue(culte.date_culte))}
                  </h3>
                  {culte.theme && (
                    <Badge variant="outline" className="text-xs shrink-0 hidden sm:inline-flex">
                      {culte.theme}
                    </Badge>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs shrink-0',
                    culte.dossier
                      ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {culte.dossier ? '☁️ Drive configuré' : '📁 Sans dossier'}
                </Badge>
              </div>

              {/* Carte Drive */}
              <DossierDriveCard
                culteId={culte.id}
                dossier={culte.dossier}
                onUpdate={d => handleDossierUpdate(culte.id, d)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
