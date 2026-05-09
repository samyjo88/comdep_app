'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Download, Upload, FileSpreadsheet, CheckCircle2,
  AlertTriangle, ChevronRight, X, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3

type Preview = {
  headers: string[]
  rows:    string[][]
  total:   number
}

type ImportResult = {
  imported: number
  errors:   { line: number; message: string }[]
}

// ── CSV helpers (client-side) ──────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  'categorie', 'numero_gad', 'titre', 'auteur_compositeur',
  'tonalite', 'tempo', 'difficulte', 'themes', 'moment_culte',
  'paroles', 'notes',
]

const TEMPLATE_ROWS = [
  'gad,245,Exemple GAD,Jean Dupont,Do,moderato,,adoration|louange,adoration|louange,"Couplet 1 :\nPremière ligne",Notes ici',
  'chorale,,Exemple Chorale,Marie Durand,Ré m,,moyen,grâce|mission,louange,"Refrain :\nLigne du refrain",',
]

const TEMPLATE_COMMENT = '# themes et moment_culte : valeurs séparées par | (ex: adoration|louange)'

function buildTemplate(): string {
  return [TEMPLATE_COMMENT, TEMPLATE_HEADERS.join(','), ...TEMPLATE_ROWS].join('\n')
}

function parsePreviewLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else { inQuotes = !inQuotes }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim()); current = ''
    } else { current += ch }
  }
  result.push(current.trim())
  return result
}

function buildPreview(text: string): Preview {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#'))

  if (lines.length < 2) return { headers: [], rows: [], total: 0 }
  const headers = parsePreviewLine(lines[0]).map(h => h.toLowerCase())
  const dataLines = lines.slice(1)
  return {
    headers,
    rows:  dataLines.slice(0, 3).map(parsePreviewLine),
    total: dataLines.length,
  }
}

// ── Step indicators ────────────────────────────────────────────────────────

function StepDots({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-1.5 justify-center mb-2">
      {([1, 2, 3] as Step[]).map(s => (
        <div
          key={s}
          className={cn(
            'h-1.5 rounded-full transition-all',
            s === current ? 'w-6 bg-primary' : s < current ? 'w-3 bg-primary/40' : 'w-3 bg-muted',
          )}
        />
      ))}
    </div>
  )
}

// ── Step 1 — Download template ─────────────────────────────────────────────

function Step1({ onNext }: { onNext: () => void }) {
  function downloadTemplate() {
    const content = buildTemplate()
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'modele_cantiques.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Modèle téléchargé')
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-muted/30 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 shrink-0">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">Modèle CSV</p>
            <p className="text-xs text-muted-foreground">11 colonnes · exemples GAD et Chorale inclus</p>
          </div>
        </div>

        {/* Colonnes */}
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_HEADERS.map(h => (
            <Badge key={h} variant="outline" className="text-[11px] font-mono px-1.5 py-0 h-5">
              {h}
            </Badge>
          ))}
        </div>

        {/* Instructions */}
        <ol className="space-y-1.5 text-sm text-muted-foreground list-none">
          {[
            '1. Téléchargez le modèle ci-dessous',
            '2. Remplissez les données dans Excel ou LibreOffice',
            '3. Sauvegardez en format .csv (séparateur : virgule)',
            '4. Importez le fichier à l\'étape suivante',
          ].map(s => (
            <li key={s} className="flex items-start gap-2 text-xs">
              <span className="text-primary/60 shrink-0">→</span>
              {s}
            </li>
          ))}
        </ol>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <strong>Astuce :</strong> Pour les colonnes <code>themes</code> et{' '}
          <code>moment_culte</code>, séparez les valeurs par <code>|</code>{' '}
          (ex : <code>adoration|louange</code>).
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={downloadTemplate}
        >
          <Download className="h-4 w-4" />
          Télécharger le modèle CSV
        </Button>
        <Button className="flex-1 gap-2" onClick={onNext}>
          Passer à l&apos;import
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Step 2 — File upload + preview ────────────────────────────────────────

function Step2({
  onImport,
  onBack,
}: {
  onImport: (csv: string, defCat: string) => Promise<void>
  onBack:   () => void
}) {
  const [isDragging,       setIsDragging]       = useState(false)
  const [preview,          setPreview]          = useState<Preview | null>(null)
  const [csvText,          setCsvText]          = useState('')
  const [defaultCategorie, setDefaultCategorie] = useState('gad')
  const [loading,          setLoading]          = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Format non supporté — utilisez un fichier .csv')
      return
    }
    const text = await file.text()
    setCsvText(text)
    setPreview(buildPreview(text))
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  async function handleImport() {
    if (!csvText) return
    setLoading(true)
    try {
      await onImport(csvText, defaultCategorie)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : preview
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-border hover:border-primary/50 hover:bg-muted/30',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleInputChange}
        />

        {preview ? (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                {preview.total} cantique{preview.total > 1 ? 's' : ''} détecté{preview.total > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cliquez pour changer de fichier
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Glissez votre fichier .csv ici</p>
              <p className="text-xs text-muted-foreground mt-0.5">ou cliquez pour choisir</p>
            </div>
          </>
        )}
      </div>

      {/* Preview table */}
      {preview && preview.rows.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Aperçu des {preview.rows.length} première{preview.rows.length > 1 ? 's' : ''} ligne{preview.rows.length > 1 ? 's' : ''} :
          </p>
          <div className="rounded-lg border overflow-auto max-h-32">
            <table className="text-xs w-full min-w-max">
              <thead className="bg-muted/50 border-b sticky top-0">
                <tr>
                  {preview.headers.map(h => (
                    <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1 truncate max-w-[120px] text-muted-foreground">
                        {cell || <span className="opacity-30">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Default category */}
      {preview && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Catégorie par défaut</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Appliquée aux lignes sans colonne <code>categorie</code> renseignée
            </p>
          </div>
          <Select value={defaultCategorie} onValueChange={setDefaultCategorie}>
            <SelectTrigger className="h-8 w-32 text-xs shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gad" className="text-xs">📘 GAD</SelectItem>
              <SelectItem value="chorale" className="text-xs">🎤 Chorale</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="gap-1.5" disabled={loading}>
          ← Retour
        </Button>
        <Button
          className="flex-1 gap-2"
          disabled={!preview || loading}
          onClick={handleImport}
        >
          {loading ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Import en cours…
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              Importer {preview ? `(${preview.total})` : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ── Step 3 — Results ───────────────────────────────────────────────────────

function Step3({
  result,
  onClose,
  onRestart,
}: {
  result:    ImportResult
  onClose:   () => void
  onRestart: () => void
}) {
  const hasErrors = result.errors.length > 0

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex flex-col gap-3">
        {result.imported > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold text-emerald-700">
              {result.imported} cantique{result.imported > 1 ? 's' : ''} importé{result.imported > 1 ? 's' : ''} avec succès
            </p>
          </div>
        )}
        {hasErrors && (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-700">
              {result.errors.length} ligne{result.errors.length > 1 ? 's' : ''} ignorée{result.errors.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
        {result.imported === 0 && !hasErrors && (
          <div className="flex items-center gap-3 rounded-xl bg-muted border px-4 py-3">
            <X className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">Aucun cantique importé.</p>
          </div>
        )}
      </div>

      {/* Error list */}
      {hasErrors && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Détail des erreurs :</p>
          <div className="rounded-lg border overflow-auto max-h-40">
            {result.errors.map((e, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 text-xs border-b last:border-0"
              >
                <span className="font-mono text-muted-foreground shrink-0 w-12">
                  ligne {e.line}
                </span>
                <span className="text-red-600">{e.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {hasErrors && (
          <Button variant="outline" onClick={onRestart} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Réessayer
          </Button>
        )}
        <Button className="flex-1" onClick={onClose}>
          {result.imported > 0 ? 'Voir les cantiques →' : 'Fermer'}
        </Button>
      </div>
    </div>
  )
}

// ── ImportCSVModal ─────────────────────────────────────────────────────────

interface ImportCSVModalProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
  onSuccess?:   () => void
}

export function ImportCSVModal({ open, onOpenChange, onSuccess }: ImportCSVModalProps) {
  const [step,   setStep]   = useState<Step>(1)
  const [result, setResult] = useState<ImportResult | null>(null)

  function reset() {
    setStep(1)
    setResult(null)
  }

  function handleClose(o: boolean) {
    onOpenChange(o)
    if (!o) setTimeout(reset, 300)
  }

  async function handleImport(csv: string, defaultCategorie: string) {
    const res = await fetch('/api/projection/import-csv', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ csv, defaultCategorie }),
    })
    const data = await res.json() as ImportResult & { error?: string }
    if (!res.ok) {
      toast.error(data.error ?? 'Erreur lors de l\'import')
      return
    }
    setResult(data)
    setStep(3)
    if (data.imported > 0) {
      toast.success(`${data.imported} cantique${data.imported > 1 ? 's' : ''} importé${data.imported > 1 ? 's' : ''}`)
      onSuccess?.()
    }
  }

  const TITLES: Record<Step, string> = {
    1: '📥 Import CSV — Modèle',
    2: '📂 Import CSV — Fichier',
    3: '✅ Import CSV — Résultat',
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <StepDots current={step} />
          <DialogTitle>{TITLES[step]}</DialogTitle>
          <DialogDescription>
            {step === 1 && 'Téléchargez le modèle et préparez votre fichier.'}
            {step === 2 && 'Chargez votre fichier CSV et vérifiez l\'aperçu.'}
            {step === 3 && 'Import terminé.'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {step === 1 && (
            <Step1 onNext={() => setStep(2)} />
          )}
          {step === 2 && (
            <Step2
              onImport={handleImport}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && result && (
            <Step3
              result={result}
              onClose={() => handleClose(false)}
              onRestart={() => { setResult(null); setStep(2) }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
