'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Sparkles, FileText, FileCheck,
  Loader2, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { publierAnnonce } from './actions'
import type { SseEvent } from '@/app/api/annonces/generer-tout/route'
import type { RubriqueAnnonce, Culte } from '@/lib/annonces'
import type { CodeRubrique } from '@/types/annonces'

// ── Constantes ────────────────────────────────────────────────────────────────

const LABELS: Record<CodeRubrique, string> = {
  salutation:      'Salutation',
  culte_precedent: 'Culte précédent',
  culte_jour:      'Culte du jour',
  conference:      'Conférence',
  district:        'District',
  circuit:         'Circuit',
  eglise_local:    'Église locale',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  return d.charAt(0).toUpperCase() + d.slice(1)
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  annonceId: string
  culte:     Culte
  rubriques: RubriqueAnnonce[]
  nomEglise: string
  statut:    string
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function ApercuClient({
  annonceId, culte, rubriques: initial, nomEglise, statut: initialStatut,
}: Props) {
  const router = useRouter()
  const [rubriques, setRubriques]       = useState(initial)
  const [generating, setGenerating]     = useState<{ current: number; total: number } | null>(null)
  const [publiePending, setPubliePending] = useState(false)
  const [statut, setStatut]             = useState(initialStatut)
  const [pdfPending, setPdfPending]     = useState(false)
  const dlLinkRef = useRef<HTMLAnchorElement>(null)

  const estPasse = culte.statut === 'passe'
  const pret  = rubriques.filter(r => r.texte_final).length
  const total = rubriques.length

  // ── Générer toutes les rubriques manquantes (SSE) ───────────────────────

  const handleGenererTout = useCallback(async () => {
    const manquantes = rubriques.filter(r => !r.texte_final)
    if (!manquantes.length) {
      toast.info('Toutes les rubriques ont déjà un texte.')
      return
    }

    setGenerating({ current: 0, total: manquantes.length })

    try {
      const response = await fetch('/api/annonces/generer-tout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ annonce_id: annonceId }),
      })

      if (!response.ok || !response.body) {
        toast.error('Erreur lors de la génération.')
        setGenerating(null)
        return
      }

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6)) as SseEvent

            if (event.type === 'progress') {
              setGenerating({ current: event.index, total: event.total })
              if (event.succes) {
                setRubriques(prev =>
                  prev.map(r => r.id === event.rubriqueId
                    ? { ...r, texte_final: event.texte, valide: true }
                    : r
                  )
                )
              }
            }

            if (event.type === 'done') {
              setGenerating(null)
              const n = event.succes
              toast.success(
                `✨ ${n} rubrique${n > 1 ? 's' : ''} générée${n > 1 ? 's' : ''} avec succès`
              )
            }

            if (event.type === 'error') {
              toast.error(`Erreur : ${event.message}`)
              setGenerating(null)
            }
          } catch { /* ligne SSE malformée, on ignore */ }
        }
      }
    } catch {
      toast.error('Erreur lors de la génération.')
      setGenerating(null)
    }
  }, [annonceId, rubriques])

  // ── Valider et publier ────────────────────────────────────────────────────

  const handlePublier = useCallback(async () => {
    setPubliePending(true)
    const result = await publierAnnonce(annonceId)
    setPubliePending(false)
    if (result.error) {
      toast.error('Erreur lors de la publication.')
      return
    }
    setStatut('valide')
    toast.success('Annonce validée et publiée !')
    router.refresh()
  }, [annonceId, router])

  // ── Exporter PDF ─────────────────────────────────────────────────────────

  const handleExportPDF = useCallback(async () => {
    setPdfPending(true)
    try {
      const res = await fetch('/api/annonces/export-pdf', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ annonce_id: annonceId }),
      })
      if (!res.ok) {
        toast.error('Erreur lors de la génération du PDF.')
        return
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = dlLinkRef.current!
      a.href     = url
      a.download = `Annonces_${culte.date_culte}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erreur lors de la génération du PDF.')
    } finally {
      setPdfPending(false)
    }
  }, [annonceId, culte.date_culte])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Barre d'actions ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2.5 sticky top-4 z-10 shadow-sm">
        <Link href={estPasse ? '/annonces/historique' : `/annonces/${annonceId}/rubriques`}>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            {estPasse ? 'Retour à l\'historique' : 'Retour à la saisie'}
          </Button>
        </Link>
        {estPasse && (
          <Badge variant="outline" className="text-xs text-muted-foreground gap-1.5">
            Mode archives — lecture seule
          </Badge>
        )}

        <div className="flex-1" />

        <span className={cn(
          'text-sm font-semibold tabular-nums px-2',
          pret === total ? 'text-emerald-600' : 'text-amber-600',
        )}>
          {pret}/{total} rubriques prêtes
        </span>

        {!estPasse && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenererTout}
            disabled={!!generating || pret === total}
            className="gap-1.5 border-violet-200 text-violet-600 hover:border-violet-300 hover:text-violet-700"
          >
            {generating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> {generating.current}/{generating.total}</>
              : <><Sparkles className="h-4 w-4" /> Générer les rubriques manquantes</>
            }
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={pdfPending || !!generating}
          className="gap-1.5"
        >
          {pdfPending
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération…</>
            : <><FileText className="h-4 w-4" /> Exporter PDF</>
          }
        </Button>
        {/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
        <a ref={dlLinkRef} className="hidden" />

        <Button variant="outline" size="sm" disabled className="gap-1.5 opacity-50 cursor-not-allowed">
          <FileCheck className="h-4 w-4" /> Exporter Word
        </Button>

        {!estPasse && (
          statut !== 'valide' ? (
            <Button
              size="sm"
              onClick={handlePublier}
              disabled={publiePending || !!generating}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {publiePending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CheckCircle2 className="h-4 w-4" />
              }
              Valider et publier
            </Button>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1.5 px-3 py-1.5 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5" /> Publiée
            </Badge>
          )
        )}
      </div>

      {/* ── Barre de progression génération ── */}
      {generating && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-violet-700 font-medium flex items-center gap-1.5">
              <Loader2 className="h-4 w-4 animate-spin" />
              Génération en cours…
            </span>
            <span className="text-violet-500 tabular-nums">
              {generating.current}/{generating.total}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-violet-100 overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${(generating.current / generating.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Document aperçu ── */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">

        {/* En-tête */}
        <div className="bg-primary text-primary-foreground text-center px-8 py-7 space-y-1.5">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase opacity-70">
            {nomEglise}
          </p>
          <h1 className="text-3xl font-bold tracking-[0.3em] uppercase">
            Annonces
          </h1>
          <p className="text-sm opacity-80">{formatDate(culte.date_culte)}</p>
        </div>

        {/* Rubriques */}
        <div className="divide-y">
          {rubriques.map((rubrique) => (
            <section key={rubrique.id} className="px-8 py-6 space-y-3">
              <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground border-b pb-2">
                {LABELS[rubrique.code_rubrique as CodeRubrique] ?? rubrique.code_rubrique}
              </h2>

              {rubrique.texte_final ? (
                <p className="text-sm leading-7 whitespace-pre-wrap text-foreground">
                  {rubrique.texte_final}
                </p>
              ) : (
                <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-sm text-amber-700 font-medium">
                    Rubrique non complétée
                  </span>
                  <Link
                    href={`/annonces/${annonceId}/rubriques`}
                    className="ml-auto text-xs text-amber-600 hover:underline shrink-0"
                  >
                    Compléter →
                  </Link>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
