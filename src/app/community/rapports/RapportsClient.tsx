'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import type { RapportCM } from '@/types/community'

// ── Types pour le contenu_json ─────────────────────────────────────────────────

interface DonneesRapport {
  posts_total?:      number
  posts_publies?:    number
  posts_en_attente?: number
  posts_annules?:    number
  taux_publication?: number
  cm_nom?:           string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSemaine(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const fin = new Date(dateStr + 'T00:00:00')
  fin.setDate(d.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${fin.toLocaleDateString('fr-FR', opts)}`
}

function StatsCards({ donnees }: { donnees: DonneesRapport }) {
  const items = [
    { label: 'Prévus',    value: donnees.posts_total ?? '—',      className: '' },
    { label: 'Publiés',   value: donnees.posts_publies ?? '—',    className: 'text-green-700' },
    { label: 'En attente',value: donnees.posts_en_attente ?? '—', className: 'text-amber-700' },
    { label: 'Annulés',   value: donnees.posts_annules ?? '—',    className: 'text-red-700' },
    { label: 'Taux pub.', value: donnees.taux_publication != null ? `${donnees.taux_publication}%` : '—', className: 'text-blue-700' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {items.map(item => (
        <div key={item.label} className="rounded-lg border p-2 text-center">
          <p className={`text-lg font-bold tabular-nums ${item.className}`}>{String(item.value)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

function RapportCard({ rapport }: { rapport: RapportCM }) {
  const [expanded, setExpanded] = useState(false)
  const donnees = (rapport.contenu_json ?? {}) as DonneesRapport

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold">
              Semaine du {formatSemaine(rapport.semaine_debut)}
            </CardTitle>
            {donnees.cm_nom && (
              <p className="text-xs text-muted-foreground">CM : {donnees.cm_nom}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {rapport.genere_le && (
              <span className="text-[10px] text-muted-foreground">
                Généré le {new Date(rapport.genere_le).toLocaleDateString('fr-FR')}
              </span>
            )}
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              IA
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <StatsCards donnees={donnees} />

        {/* Resume texte */}
        {rapport.resume_texte && (
          <div>
            <div
              className={`text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 ${!expanded ? 'line-clamp-4' : ''}`}
            >
              {rapport.resume_texte}
            </div>
            {rapport.resume_texte.length > 300 && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 h-7 text-xs gap-1 px-2"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <><ChevronUp className="h-3.5 w-3.5" /> Réduire</>
                ) : (
                  <><ChevronDown className="h-3.5 w-3.5" /> Lire tout le rapport</>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── RapportsClient ────────────────────────────────────────────────────────────

export default function RapportsClient({
  rapports,
  semaineDebut,
}: {
  rapports:    RapportCM[]
  semaineDebut: string
}) {
  const router              = useRouter()
  const [, startTransition] = useTransition()
  const [generating, setGenerating] = useState(false)
  const [genErr,     setGenErr]     = useState<string | null>(null)

  async function handleGenerate() {
    setGenerating(true)
    setGenErr(null)
    try {
      const res = await fetch('/api/community/rapport', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ semaine_debut: semaineDebut }),
      })
      const json = await res.json()
      if (!res.ok) { setGenErr(json.error ?? 'Erreur lors de la génération'); return }
      startTransition(() => router.refresh())
    } catch (e) {
      setGenErr(String(e))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Generate CTA */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Générer le rapport de la semaine en cours
          </h2>
          <p className="text-xs text-muted-foreground">
            L&apos;IA analysera les posts de la semaine du {formatSemaine(semaineDebut)} et rédigera un rapport structuré.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="shrink-0 gap-2"
        >
          {generating ? (
            <><RefreshCw className="h-4 w-4 animate-spin" /> Génération en cours…</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Générer le rapport</>
          )}
        </Button>
      </div>

      {genErr && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {genErr}
        </div>
      )}

      {/* Rapports list */}
      {rapports.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          Aucun rapport généré pour l&apos;instant.
        </p>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Rapports récents ({rapports.length})
          </h3>
          {rapports.map(r => (
            <RapportCard key={r.id} rapport={r} />
          ))}
        </div>
      )}
    </div>
  )
}
