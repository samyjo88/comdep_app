'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Printer, FileDown, ClipboardList,
  Check, Eye, EyeOff, Loader2,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type ItemCantique = {
  id:         string
  categorie:  'gad' | 'chorale'
  numero_gad: string | null
  titre:      string
  tonalite:   string | null
  paroles:    string | null
}

type SetlistItem = {
  id:                string
  position:          number
  moment_culte:      string | null
  tonalite_utilisee: string | null
  notes_operateur:   string | null
  cantiques:         ItemCantique
}

export type SetlistForApercu = {
  id:            string
  statut:        string
  titre_setlist: string | null
  cultes: {
    date_culte:  string
    theme:       string | null
    predicateur: string | null
  } | null
  setlist_items: SetlistItem[]
}

// ── Constants & helpers ──────────────────────────────────────────────────────

const MOMENT_LABELS: Record<string, string> = {
  adoration:  'Adoration',
  louange:    'Louange',
  offertoire: 'Offertoire',
  communion:  'Communion',
  envoi:      'Envoi',
  special:    'Spécial',
}

const STATUT_CONFIG: Record<string, { label: string; badge: string }> = {
  brouillon: { label: 'Brouillon', badge: 'bg-muted text-muted-foreground border-border' },
  valide:    { label: 'Validée',   badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  utilise:   { label: 'Utilisée',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

function formatDateLongue(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function getMomentLabel(val: string | null): string {
  if (!val) return '—'
  return MOMENT_LABELS[val] ?? val
}

function firstFourLines(paroles: string | null): string[] {
  if (!paroles?.trim()) return []
  const sectionRe = /^(refrain|couplet|verset|pont|bridge|intro|outro|interlude|chorus|verse)\s*\d*\s*:?$/i
  return paroles
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !sectionRe.test(l))
    .slice(0, 4)
}

function buildCopyText(setlist: SetlistForApercu): string {
  const culte     = setlist.cultes
  const dateLabel = culte?.date_culte
    ? capitalize(formatDateLongue(culte.date_culte))
    : (setlist.titre_setlist ?? 'Setlist')

  const header = `SETLIST – ${dateLabel}`
  const lines  = sortedItems(setlist).map((item, idx) => {
    const c      = item.cantiques
    const isGad  = c.categorie === 'gad'
    const ref    = isGad ? ` (GAD ${c.numero_gad ?? ''})`.trimEnd().replace(/\s+\)$/, ')') : ' (Chorale)'
    const ton    = item.tonalite_utilisee ? ` – ${item.tonalite_utilisee}` : ''
    const moment = item.moment_culte ? ` – ${getMomentLabel(item.moment_culte)}` : ''
    return `${idx + 1}. ${c.titre}${ref}${ton}${moment}`
  })

  return [header, '', ...lines].join('\n')
}

function sortedItems(setlist: SetlistForApercu): SetlistItem[] {
  return [...setlist.setlist_items].sort((a, b) => a.position - b.position)
}

// ── Print styles injected via <style> ────────────────────────────────────────

const PRINT_CSS = `
@media print {
  /* Reveal only the apercu root */
  body * { visibility: hidden; }
  #apercu-print-root, #apercu-print-root * { visibility: visible; }
  #apercu-print-root {
    position: absolute;
    inset: 0;
    width: 100%;
    padding: 0;
    background: white;
    color: black;
    font-family: Georgia, "Times New Roman", Times, serif;
    font-size: 12pt;
    line-height: 1.5;
  }

  @page { size: A4 portrait; margin: 2cm; }

  /* Header */
  .print-page-title {
    text-align: center;
    font-size: 20pt;
    font-weight: bold;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 0.4em;
  }
  .print-meta {
    text-align: center;
    font-size: 11pt;
    line-height: 1.8;
    border-bottom: 2px solid #000;
    padding-bottom: 0.8em;
    margin-bottom: 1.2em;
  }

  /* Table */
  .print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
  }
  .print-table th,
  .print-table td {
    border: 1px solid #333;
    padding: 5pt 7pt;
    text-align: left;
    vertical-align: top;
  }
  .print-table thead th {
    background: #ebebeb;
    font-weight: bold;
  }
  .print-table thead { display: table-header-group; }
  .print-table tr    { page-break-inside: avoid; }

  /* Paroles */
  .print-paroles-section { margin-top: 1.8em; }
  .print-paroles-item {
    page-break-inside: avoid;
    margin-bottom: 1em;
    padding-bottom: 0.6em;
    border-bottom: 1px dotted #aaa;
  }
  .print-paroles-item:last-child { border-bottom: none; }
  .print-paroles-item h3 { font-size: 11pt; font-weight: bold; margin-bottom: 0.25em; }
  .print-paroles-item p  { font-size: 10pt; color: #222; }

  /* Separator */
  .print-section-sep {
    border: none;
    border-top: 1px solid #666;
    margin: 1em 0;
  }
}`

// ── ApercuClient ─────────────────────────────────────────────────────────────

export default function ApercuClient({
  setlist,
}: {
  setlist: SetlistForApercu
}) {
  const [showParoles, setShowParoles] = useState(false)
  const [copied, setCopied]           = useState(false)
  const [downloading, setDownloading] = useState(false)

  const culte      = setlist.cultes
  const items      = sortedItems(setlist)
  const hasNotes   = items.some(i => i.notes_operateur)
  const hasParoles = items.some(i => i.cantiques.paroles?.trim())
  const statutCfg  = STATUT_CONFIG[setlist.statut] ?? STATUT_CONFIG.brouillon

  const dateLabel = culte?.date_culte
    ? capitalize(formatDateLongue(culte.date_culte))
    : (setlist.titre_setlist ?? 'Setlist')

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handlePrint() {
    window.print()
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildCopyText(setlist))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* clipboard unavailable */
    }
  }

  async function handleExportHTML() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/projection/setlists/export-pdf?id=${setlist.id}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `setlist-${culte?.date_culte ?? setlist.id}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  // ── Shared printable content ───────────────────────────────────────────────

  const PrintableContent = (
    <div id="apercu-print-root" className="bg-white">
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* ── Document header ──────────────────────────────────────────── */}
        <div className="print-page-title text-center mb-3">
          <h1 className="text-2xl font-bold tracking-widest uppercase font-serif">
            Setlist du culte
          </h1>
        </div>

        <div className="print-meta text-center border-b pb-4 mb-6 space-y-1">
          <p className="text-lg font-semibold">{dateLabel}</p>
          {culte?.theme && (
            <p className="text-sm text-muted-foreground print:text-gray-600">
              {culte.theme}
            </p>
          )}
          {culte?.predicateur && (
            <p className="text-sm text-muted-foreground print:text-gray-600">
              Prédicateur : {culte.predicateur}
            </p>
          )}
          <div className="flex justify-center pt-1">
            <Badge variant="outline" className={`text-xs ${statutCfg.badge} print:hidden`}>
              {statutCfg.label}
            </Badge>
          </div>
        </div>

        {/* ── Setlist table ─────────────────────────────────────────────── */}
        <table className="print-table w-full border-collapse text-sm">
          <thead className="bg-muted/40 print:bg-gray-100">
            <tr>
              <th className="border px-3 py-2 text-left w-10">#</th>
              <th className="border px-3 py-2 text-left">Cantique</th>
              <th className="border px-3 py-2 text-left w-24">Catégorie</th>
              <th className="border px-3 py-2 text-left w-24">Tonalité</th>
              <th className="border px-3 py-2 text-left w-28">Moment</th>
              {hasNotes && (
                <th className="border px-3 py-2 text-left">Notes opérateur</th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={hasNotes ? 6 : 5}
                  className="border px-3 py-6 text-center text-muted-foreground italic"
                >
                  Aucun cantique dans cette setlist.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const c     = item.cantiques
                const isGad = c.categorie === 'gad'
                const titreRef = isGad
                  ? `${c.titre}${c.numero_gad ? ` (GAD ${c.numero_gad})` : ''}`
                  : c.titre
                const tonalite = item.tonalite_utilisee ?? c.tonalite ?? '—'

                return (
                  <tr key={item.id} className="print-table-row even:bg-muted/20 print:even:bg-gray-50">
                    <td className="border px-3 py-2 font-mono text-center text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="border px-3 py-2">
                      <span className="font-medium">{titreRef}</span>
                      {!isGad && (
                        <span className="ml-1 text-amber-700 text-xs">(Chorale)</span>
                      )}
                    </td>
                    <td className="border px-3 py-2">
                      <span className={`text-xs font-medium ${isGad ? 'text-blue-700' : 'text-amber-700'}`}>
                        {isGad ? '📘 GAD' : '🎤 Chorale'}
                      </span>
                    </td>
                    <td className="border px-3 py-2 font-mono text-sm">
                      {tonalite}
                    </td>
                    <td className="border px-3 py-2 text-sm">
                      {getMomentLabel(item.moment_culte)}
                    </td>
                    {hasNotes && (
                      <td className="border px-3 py-2 text-sm text-muted-foreground print:text-gray-600 italic">
                        {item.notes_operateur ?? ''}
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* ── Paroles rapides ───────────────────────────────────────────── */}
        {showParoles && hasParoles && (
          <div className="print-paroles-section mt-8">
            <hr className="print-section-sep border-t my-4 print:border-gray-400" />
            <h2 className="text-base font-bold uppercase tracking-wide mb-4 font-serif">
              Paroles rapides (aide-mémoire)
            </h2>
            <div className="space-y-4">
              {items.map((item, idx) => {
                const lines = firstFourLines(item.cantiques.paroles)
                if (lines.length === 0) return null
                return (
                  <div key={item.id} className="print-paroles-item">
                    <h3 className="text-sm font-semibold border-b pb-1 mb-2">
                      {idx + 1}. {item.cantiques.titre}
                    </h3>
                    <div className="space-y-0.5 pl-2">
                      {lines.map((line, i) => (
                        <p key={i} className="text-sm text-muted-foreground print:text-gray-700 leading-snug">
                          {line}
                        </p>
                      ))}
                      {(item.cantiques.paroles?.split(/\r?\n/).filter(l => l.trim()).length ?? 0) > 4 && (
                        <p className="text-xs text-muted-foreground/60 italic mt-1">…</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )

  // ── Screen render ──────────────────────────────────────────────────────────

  return (
    <>
      {/* Inject print styles */}
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="min-h-screen bg-muted/30 print:bg-white">

        {/* ── Action bar (hidden on print) ─────────────────────────────── */}
        <div className="no-print print:hidden sticky top-[calc(theme(spacing.12)+var(--projection-nav-h,60px))] z-20 bg-background/95 backdrop-blur border-b px-4 py-2.5 flex flex-wrap items-center gap-2">

          <Link href={`/projection/setlists/${setlist.id}/edit`}>
            <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Retour à l&apos;éditeur
            </Button>
          </Link>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimer
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={handleExportHTML}
            disabled={downloading}
          >
            {downloading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <FileDown className="h-3.5 w-3.5" />}
            Télécharger
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={handleCopy}
          >
            {copied
              ? <Check className="h-3.5 w-3.5 text-emerald-600" />
              : <ClipboardList className="h-3.5 w-3.5" />}
            {copied ? 'Copié !' : 'Copier la liste'}
          </Button>

          {hasParoles && (
            <Button
              variant={showParoles ? 'secondary' : 'outline'}
              size="sm"
              className="gap-1.5 h-8 text-xs ml-auto"
              onClick={() => setShowParoles(v => !v)}
            >
              {showParoles
                ? <EyeOff className="h-3.5 w-3.5" />
                : <Eye className="h-3.5 w-3.5" />}
              {showParoles ? 'Masquer les paroles' : 'Afficher les paroles'}
            </Button>
          )}
        </div>

        {/* ── Printable document ───────────────────────────────────────── */}
        <div className="py-6 px-4">
          <div className="max-w-3xl mx-auto shadow-sm rounded-lg border bg-white print:shadow-none print:border-none">
            {PrintableContent}
          </div>
        </div>

      </div>
    </>
  )
}
