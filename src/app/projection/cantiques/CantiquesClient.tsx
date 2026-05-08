'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetBody,
} from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  Search, Plus, Download, Music, Users, Pencil, BookOpen,
  ListPlus, ChevronDown, FileAudio, FileText, Loader2, X, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createCantiqueAction, updateCantiqueAction, deleteCantiqueAction } from './actions'

// ── Types ──────────────────────────────────────────────────────────────────

export type Cantique = {
  id: string
  categorie: 'gad' | 'chorale'
  numero_gad: string | null
  titre: string
  sous_titre: string | null
  auteur_compositeur: string | null
  tonalite: string | null
  tempo: string | null
  paroles: string | null
  lien_partition: string | null
  lien_audio: string | null
  themes: string[] | null
  moment_culte: string[] | null
  difficulte: string | null
  occasion: string[] | null
  actif: boolean
  nb_utilisations: number
  created_at: string
  notes: string | null
}

// ── Constants ──────────────────────────────────────────────────────────────

const MOMENTS_CULTE = [
  { value: 'adoration',   label: 'Adoration' },
  { value: 'louange',     label: 'Louange' },
  { value: 'offertoire',  label: 'Offertoire' },
  { value: 'communion',   label: 'Communion' },
  { value: 'envoi',       label: 'Envoi' },
  { value: 'special',     label: 'Spécial' },
]

const TONALITES = [
  'Do', 'Do m', 'Ré', 'Ré m', 'Mi', 'Mi m',
  'Fa', 'Fa m', 'Sol', 'Sol m', 'La', 'La m', 'Si', 'Si m',
]

const TEMPOS = [
  { value: 'lent',      label: 'Lent' },
  { value: 'moderato',  label: 'Modéré' },
  { value: 'vif',       label: 'Vif' },
]

const DIFFICULTES = [
  { value: 'facile',    label: 'Facile' },
  { value: 'moyen',     label: 'Moyen' },
  { value: 'difficile', label: 'Difficile' },
]

const OCCASIONS = [
  { value: 'culte_ordinaire', label: 'Culte ordinaire' },
  { value: 'communion',       label: 'Communion' },
  { value: 'bapteme',         label: 'Baptême' },
  { value: 'mariage',         label: 'Mariage' },
  { value: 'noel',            label: 'Noël' },
  { value: 'paques',          label: 'Pâques' },
]

const THEMES_PRESET = [
  'adoration', 'louange', 'grâce', 'noël', 'espérance',
  'mission', 'repentance', 'action de grâce', 'sainteté', 'paix',
]

const SORT_OPTIONS_GAD    = ['titre', 'numero', 'utilisation', 'date'] as const
const SORT_OPTIONS_CHORALE = ['titre', 'utilisation', 'date'] as const

type SortGad    = typeof SORT_OPTIONS_GAD[number]
type SortChorale = typeof SORT_OPTIONS_CHORALE[number]

const SORT_LABELS: Record<string, string> = {
  titre:      'Titre A–Z',
  numero:     'Numéro',
  utilisation: 'Utilisation',
  date:       'Ajout récent',
}

const PAGE_SIZE = 24

// ── Helpers ────────────────────────────────────────────────────────────────

function sortNumeroGad(a: string | null, b: string | null): number {
  const na = parseInt(a ?? '9999')
  const nb = parseInt(b ?? '9999')
  if (!isNaN(na) && !isNaN(nb)) return na - nb
  return (a ?? '').localeCompare(b ?? '', 'fr')
}

// ── MultiSelectDropdown ────────────────────────────────────────────────────

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label:    string
  options:  { value: string; label: string }[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const count = selected.length
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 text-xs font-normal',
            count > 0 && 'border-primary text-primary',
          )}
        >
          {label}
          {count > 0 && (
            <Badge className="h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground">
              {count}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        <DropdownMenuLabel className="text-xs">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {selected.length > 0 && (
          <>
            <button
              className="w-full text-left px-2 py-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              onClick={() => onChange([])}
            >
              <X className="h-3 w-3" /> Tout effacer
            </button>
            <DropdownMenuSeparator />
          </>
        )}
        {options.map(opt => (
          <DropdownMenuCheckboxItem
            key={opt.value}
            checked={selected.includes(opt.value)}
            onCheckedChange={checked =>
              onChange(checked
                ? [...selected, opt.value]
                : selected.filter(v => v !== opt.value)
              )
            }
            className="text-xs"
          >
            {opt.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── ChipsFilter ────────────────────────────────────────────────────────────

function ChipsFilter({
  options,
  value,
  onChange,
}: {
  options:  { value: string; label: string }[]
  value:    string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Button
        size="sm"
        variant={value === 'all' ? 'default' : 'outline'}
        className="h-7 px-2.5 text-xs"
        onClick={() => onChange('all')}
      >
        Tous
      </Button>
      {options.map(opt => (
        <Button
          key={opt.value}
          size="sm"
          variant={value === opt.value ? 'default' : 'outline'}
          className="h-7 px-2.5 text-xs"
          onClick={() => onChange(value === opt.value ? 'all' : opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  )
}

// ── FreqBar ────────────────────────────────────────────────────────────────

function FreqBar({ count, max }: { count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary/50 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-6 text-right">
        {count}×
      </span>
    </div>
  )
}

// ── GadCard ────────────────────────────────────────────────────────────────

function GadCard({
  c, maxUtil,
  onParoles, onEdit, onSetlist,
}: {
  c:         Cantique
  maxUtil:   number
  onParoles: () => void
  onEdit:    () => void
  onSetlist: () => void
}) {
  return (
    <Card className={cn('flex flex-col gap-0', !c.actif && 'opacity-60')}>
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1 shrink-0 min-w-[3rem]">
            <Badge
              variant="outline"
              className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0 h-5 font-bold"
            >
              GAD
            </Badge>
            {c.numero_gad && (
              <span className="text-2xl font-black tabular-nums leading-none text-blue-700">
                {c.numero_gad}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-base leading-tight">{c.titre}</p>
            {c.auteur_compositeur && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.auteur_compositeur}</p>
            )}
          </div>
          {!c.actif && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0 text-muted-foreground">
              Inactif
            </Badge>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {c.tonalite && (
            <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5">
              {c.tonalite}
            </Badge>
          )}
          {c.tempo && (
            <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 capitalize">
              {TEMPOS.find(t => t.value === c.tempo)?.label ?? c.tempo}
            </Badge>
          )}
          {(c.moment_culte ?? []).map(m => (
            <Badge
              key={m}
              variant="outline"
              className="text-[11px] px-1.5 py-0 h-5 bg-blue-50 text-blue-600 border-blue-200"
            >
              {MOMENTS_CULTE.find(mc => mc.value === m)?.label ?? m}
            </Badge>
          ))}
        </div>

        {/* Fréquence */}
        <FreqBar count={c.nb_utilisations} max={maxUtil} />

        {/* Links */}
        {(c.lien_partition || c.lien_audio) && (
          <div className="flex items-center gap-2">
            {c.lien_partition && (
              <a
                href={c.lien_partition}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <FileText className="h-3 w-3" /> Partition
              </a>
            )}
            {c.lien_audio && (
              <a
                href={c.lien_audio}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <FileAudio className="h-3 w-3" /> Audio
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-1 border-t flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 flex-1 min-w-0"
            onClick={onParoles}
            disabled={!c.paroles}
          >
            <BookOpen className="h-3 w-3 shrink-0" />
            <span className="truncate">Paroles</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 px-2"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 flex-1 min-w-0"
            onClick={onSetlist}
          >
            <ListPlus className="h-3 w-3 shrink-0" />
            <span className="truncate">Setlist</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── ChoraleCard ────────────────────────────────────────────────────────────

function ChoraleCard({
  c, maxUtil,
  onParoles, onEdit, onSetlist,
}: {
  c:         Cantique
  maxUtil:   number
  onParoles: () => void
  onEdit:    () => void
  onSetlist: () => void
}) {
  return (
    <Card className={cn('flex flex-col gap-0', !c.actif && 'opacity-60')}>
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            <Badge
              variant="outline"
              className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0 h-5 font-bold"
            >
              CHORALE
            </Badge>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-base leading-tight">{c.titre}</p>
            {c.sous_titre && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate italic">{c.sous_titre}</p>
            )}
            {c.auteur_compositeur && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.auteur_compositeur}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {!c.actif && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground">
                Inactif
              </Badge>
            )}
            <div className="flex items-center gap-1.5">
              {c.lien_partition && (
                <a href={c.lien_partition} target="_blank" rel="noopener noreferrer" title="Partition disponible">
                  <FileText className="h-4 w-4 text-emerald-600 hover:text-emerald-700" />
                </a>
              )}
              {c.lien_audio && (
                <a href={c.lien_audio} target="_blank" rel="noopener noreferrer" title="Audio disponible">
                  <FileAudio className="h-4 w-4 text-blue-600 hover:text-blue-700" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {c.tonalite && (
            <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5">
              {c.tonalite}
            </Badge>
          )}
          {c.difficulte && (
            <Badge
              variant="outline"
              className={cn(
                'text-[11px] px-1.5 py-0 h-5',
                c.difficulte === 'facile'    && 'bg-green-50 text-green-700 border-green-200',
                c.difficulte === 'moyen'     && 'bg-amber-50 text-amber-700 border-amber-200',
                c.difficulte === 'difficile' && 'bg-red-50 text-red-700 border-red-200',
              )}
            >
              {DIFFICULTES.find(d => d.value === c.difficulte)?.label ?? c.difficulte}
            </Badge>
          )}
          {(c.moment_culte ?? []).map(m => (
            <Badge
              key={m}
              variant="outline"
              className="text-[11px] px-1.5 py-0 h-5 bg-amber-50 text-amber-600 border-amber-200"
            >
              {MOMENTS_CULTE.find(mc => mc.value === m)?.label ?? m}
            </Badge>
          ))}
          {(c.occasion ?? []).slice(0, 2).map(o => (
            <Badge key={o} variant="outline" className="text-[11px] px-1.5 py-0 h-5 capitalize">
              {OCCASIONS.find(oc => oc.value === o)?.label ?? o}
            </Badge>
          ))}
          {(c.occasion ?? []).length > 2 && (
            <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 text-muted-foreground">
              +{(c.occasion ?? []).length - 2}
            </Badge>
          )}
        </div>

        {/* Fréquence */}
        <FreqBar count={c.nb_utilisations} max={maxUtil} />

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-1 border-t flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 flex-1 min-w-0"
            onClick={onParoles}
            disabled={!c.paroles}
          >
            <BookOpen className="h-3 w-3 shrink-0" />
            <span className="truncate">Paroles</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 px-2"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 flex-1 min-w-0"
            onClick={onSetlist}
          >
            <ListPlus className="h-3 w-3 shrink-0" />
            <span className="truncate">Setlist</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── ParolesSheet ───────────────────────────────────────────────────────────

function ParolesSheet({
  cantique,
  onClose,
}: {
  cantique: Cantique | null
  onClose:  () => void
}) {
  return (
    <Sheet open={!!cantique} onOpenChange={open => { if (!open) onClose() }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            {cantique?.categorie === 'gad' ? (
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-[11px]">
                GAD {cantique.numero_gad && `· ${cantique.numero_gad}`}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-[11px]">
                CHORALE
              </Badge>
            )}
          </div>
          <SheetTitle className="text-xl">{cantique?.titre}</SheetTitle>
          {cantique?.auteur_compositeur && (
            <SheetDescription>{cantique.auteur_compositeur}</SheetDescription>
          )}
        </SheetHeader>
        <SheetBody>
          {cantique?.paroles ? (
            <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {cantique.paroles}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground italic">Paroles non renseignées.</p>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

// ── TagsInput ──────────────────────────────────────────────────────────────

function TagsInput({
  label, value, onChange, presets, placeholder,
}: {
  label:       string
  value:       string[]
  onChange:    (v: string[]) => void
  presets?:    string[]
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  function add(tag: string) {
    const t = tag.trim().toLowerCase()
    if (t && !value.includes(t)) onChange([...value, t])
    setInput('')
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {presets && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {presets.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => value.includes(p) ? onChange(value.filter(v => v !== p)) : onChange([...value, p])}
              className={cn(
                'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                value.includes(p)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground hover:text-foreground border-border',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {value.map(tag => (
            <span
              key={tag}
              className="flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5"
            >
              {tag}
              <button type="button" onClick={() => onChange(value.filter(v => v !== tag))}>
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(input) } }}
          placeholder={placeholder ?? `Ajouter un ${label.toLowerCase()}…`}
          className="h-8 text-xs"
        />
        <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => add(input)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── ChipsFormInput ─────────────────────────────────────────────────────────

function ChipsFormInput({
  label, options, value, onChange,
}: {
  label:   string
  options: { value: string; label: string }[]
  value:   string[]
  onChange:(v: string[]) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => value.includes(opt.value)
              ? onChange(value.filter(v => v !== opt.value))
              : onChange([...value, opt.value])
            }
            className={cn(
              'text-xs px-2.5 py-1 rounded-full border transition-colors',
              value.includes(opt.value)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground hover:text-foreground border-border',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── CantiquesForm ──────────────────────────────────────────────────────────

function CantiquesForm({
  categorie,
  editing,
  onDone,
}: {
  categorie: 'gad' | 'chorale'
  editing:   Cantique | null
  onDone:    () => void
}) {
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  // Champs communs
  const [titre,      setTitre]     = useState(editing?.titre ?? '')
  const [sousTitre,  setSousTitre] = useState(editing?.sous_titre ?? '')
  const [auteur,     setAuteur]    = useState(editing?.auteur_compositeur ?? '')
  const [tonalite,   setTonalite]  = useState(editing?.tonalite ?? '')
  const [paroles,    setParoles]   = useState(editing?.paroles ?? '')
  const [partition,  setPartition] = useState(editing?.lien_partition ?? '')
  const [audio,      setAudio]     = useState(editing?.lien_audio ?? '')
  const [actif,      setActif]     = useState(editing?.actif ?? true)
  const [notes,      setNotes]     = useState(editing?.notes ?? '')
  const [moments,    setMoments]   = useState<string[]>(editing?.moment_culte ?? [])

  // GAD spécifique
  const [numeroGad, setNumeroGad] = useState(editing?.numero_gad ?? '')
  const [tempo,     setTempo]     = useState(editing?.tempo ?? '')
  const [themes,    setThemes]    = useState<string[]>(editing?.themes ?? [])

  // Chorale spécifique
  const [difficulte, setDifficulte] = useState(editing?.difficulte ?? '')
  const [occasion,   setOccasion]   = useState<string[]>(editing?.occasion ?? [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titre.trim()) { setErr('Le titre est requis.'); return }
    setLoading(true)
    setErr(null)

    const payload = {
      categorie,
      titre:               titre.trim(),
      sous_titre:          sousTitre.trim() || null,
      auteur_compositeur:  auteur.trim() || null,
      tonalite:            tonalite || null,
      paroles:             paroles.trim() || null,
      lien_partition:      partition.trim() || null,
      lien_audio:          audio.trim() || null,
      actif,
      notes:               notes.trim() || null,
      moment_culte:        moments.length > 0 ? moments : null,
      // GAD
      numero_gad:          categorie === 'gad' ? (numeroGad.trim() || null) : null,
      tempo:               categorie === 'gad' ? (tempo || null) : null,
      themes:              categorie === 'gad' ? (themes.length > 0 ? themes : null) : null,
      // Chorale
      difficulte:          categorie === 'chorale' ? (difficulte || null) : null,
      occasion:            categorie === 'chorale' ? (occasion.length > 0 ? occasion : null) : null,
    }

    try {
      const result = editing
        ? await updateCantiqueAction(editing.id, payload)
        : await createCantiqueAction(payload)
      if (result?.error) { setErr(result.error); return }
      toast.success(editing ? 'Cantique mis à jour' : 'Cantique ajouté')
      onDone()
    } catch (e) {
      setErr(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {categorie === 'gad' && (
        <div className="space-y-1.5">
          <Label htmlFor="numero">Numéro GAD</Label>
          <Input
            id="numero"
            value={numeroGad}
            onChange={e => setNumeroGad(e.target.value)}
            placeholder="ex: 245, 12b…"
            className="h-8 text-sm"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="titre">Titre *</Label>
        <Input
          id="titre"
          value={titre}
          onChange={e => setTitre(e.target.value)}
          placeholder="Titre du cantique"
          required
          className="h-8 text-sm"
        />
      </div>

      {categorie === 'chorale' && (
        <div className="space-y-1.5">
          <Label htmlFor="sous_titre">Sous-titre</Label>
          <Input
            id="sous_titre"
            value={sousTitre}
            onChange={e => setSousTitre(e.target.value)}
            placeholder="Sous-titre…"
            className="h-8 text-sm"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="auteur">Auteur / Compositeur</Label>
        <Input
          id="auteur"
          value={auteur}
          onChange={e => setAuteur(e.target.value)}
          placeholder="Nom de l'auteur…"
          className="h-8 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tonalité</Label>
          <Select value={tonalite} onValueChange={setTonalite}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {TONALITES.map(t => (
                <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {categorie === 'gad' && (
          <div className="space-y-1.5">
            <Label>Tempo</Label>
            <Select value={tempo} onValueChange={setTempo}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {TEMPOS.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {categorie === 'chorale' && (
          <div className="space-y-1.5">
            <Label>Difficulté</Label>
            <Select value={difficulte} onValueChange={setDifficulte}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {DIFFICULTES.map(d => (
                  <SelectItem key={d.value} value={d.value} className="text-sm">{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <ChipsFormInput
        label="Moment du culte"
        options={MOMENTS_CULTE}
        value={moments}
        onChange={setMoments}
      />

      {categorie === 'gad' && (
        <TagsInput
          label="Thèmes"
          value={themes}
          onChange={setThemes}
          presets={THEMES_PRESET}
        />
      )}

      {categorie === 'chorale' && (
        <ChipsFormInput
          label="Occasion"
          options={OCCASIONS}
          value={occasion}
          onChange={setOccasion}
        />
      )}

      <div className="space-y-1.5">
        <Label htmlFor="paroles">Paroles</Label>
        <Textarea
          id="paroles"
          value={paroles}
          onChange={e => setParoles(e.target.value)}
          placeholder="Couplets et refrains séparés par des sauts de ligne…"
          rows={5}
          className="text-sm resize-y"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="partition">Lien partition</Label>
          <Input
            id="partition"
            value={partition}
            onChange={e => setPartition(e.target.value)}
            placeholder="https://…"
            type="url"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audio">Lien audio</Label>
          <Input
            id="audio"
            value={audio}
            onChange={e => setAudio(e.target.value)}
            placeholder="https://…"
            type="url"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes internes…"
          rows={2}
          className="text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch id="actif" checked={actif} onCheckedChange={setActif} />
        <Label htmlFor="actif">Cantique actif</Label>
      </div>

      {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2.5">{err}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onDone} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {loading ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Ajouter'}
        </Button>
      </div>
    </form>
  )
}

// ── ImportCsvSheet ─────────────────────────────────────────────────────────

function ImportCsvSheet({
  open,
  onClose,
}: {
  open:    boolean
  onClose: () => void
}) {
  const [csv, setCsv] = useState('')

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose() }}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Importer des cantiques (CSV)</SheetTitle>
          <SheetDescription>
            Collez votre CSV avec les colonnes :<br />
            <code className="text-xs bg-muted px-1 rounded">
              categorie, numero_gad, titre, auteur_compositeur, tonalite, tempo
            </code>
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <Textarea
            value={csv}
            onChange={e => setCsv(e.target.value)}
            placeholder={'categorie,numero_gad,titre,auteur,tonalite\ngad,245,Mon cantique,Jean Dupont,Do'}
            rows={12}
            className="text-xs font-mono resize-y"
          />
          <p className="text-xs text-muted-foreground">
            La première ligne doit être l&apos;en-tête. Les champs manquants seront ignorés.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button
              className="flex-1 gap-1.5"
              disabled={!csv.trim()}
              onClick={() => toast.info('Import CSV — fonctionnalité à venir')}
            >
              <Download className="h-3.5 w-3.5" />
              Importer
            </Button>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

// ── CantiquesClient ────────────────────────────────────────────────────────

export default function CantiquesClient({
  gad,
  chorale,
}: {
  gad:     Cantique[]
  chorale: Cantique[]
}) {
  const router              = useRouter()
  const [, startTransition] = useTransition()

  // Tabs
  const [activeTab, setActiveTab] = useState<'gad' | 'chorale'>('gad')

  // Search + sort
  const [search,      setSearch]      = useState('')
  const [sortGad,     setSortGad]     = useState<SortGad>('numero')
  const [sortChorale, setSortChorale] = useState<SortChorale>('titre')

  // Pagination
  const [limitGad,     setLimitGad]     = useState(PAGE_SIZE)
  const [limitChorale, setLimitChorale] = useState(PAGE_SIZE)

  // GAD filters
  const [momentGad,  setMomentGad]  = useState('all')
  const [tonalite,   setTonalite]   = useState<string[]>([])
  const [tempo,      setTempo]      = useState('all')
  const [themes,     setThemes]     = useState<string[]>([])

  // Chorale filters
  const [momentChorale, setMomentChorale] = useState('all')
  const [difficulte,    setDifficulte]    = useState('all')
  const [occasion,      setOccasion]      = useState<string[]>([])

  // Sheets
  const [parolesOf,   setParolesOf]   = useState<Cantique | null>(null)
  const [editOf,      setEditOf]      = useState<Cantique | null>(null)
  const [isAdding,    setIsAdding]    = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  function refresh() { startTransition(() => router.refresh()) }

  function handleAddSetlist(c: Cantique) {
    toast.info(`Ajout de « ${c.titre} » à une setlist — disponible depuis la page Setlists`)
  }

  async function handleDelete(c: Cantique) {
    if (!confirm(`Supprimer définitivement « ${c.titre} » ?`)) return
    const result = await deleteCantiqueAction(c.id)
    if (result?.error) { toast.error(result.error); return }
    toast.success('Cantique supprimé')
    refresh()
  }

  void handleDelete // accessible from edit sheet only — suppress lint

  // ── Filtered & sorted lists ──────────────────────────────────────────────

  const filteredGad = useMemo(() => {
    const q = search.trim().toLowerCase()
    return gad
      .filter(c => {
        if (q) {
          const hit = c.titre.toLowerCase().includes(q) ||
            (c.numero_gad ?? '').toLowerCase().includes(q) ||
            (c.auteur_compositeur ?? '').toLowerCase().includes(q) ||
            (c.paroles ?? '').toLowerCase().includes(q)
          if (!hit) return false
        }
        if (momentGad !== 'all' && !c.moment_culte?.includes(momentGad)) return false
        if (tonalite.length > 0 && !tonalite.includes(c.tonalite ?? '')) return false
        if (tempo !== 'all' && c.tempo !== tempo) return false
        if (themes.length > 0 && !themes.some(t => c.themes?.includes(t))) return false
        return true
      })
      .sort((a, b) => {
        if (sortGad === 'numero')     return sortNumeroGad(a.numero_gad, b.numero_gad)
        if (sortGad === 'utilisation') return b.nb_utilisations - a.nb_utilisations
        if (sortGad === 'date')       return b.created_at.localeCompare(a.created_at)
        return a.titre.localeCompare(b.titre, 'fr')
      })
  }, [gad, search, momentGad, tonalite, tempo, themes, sortGad])

  const filteredChorale = useMemo(() => {
    const q = search.trim().toLowerCase()
    return chorale
      .filter(c => {
        if (q) {
          const hit = c.titre.toLowerCase().includes(q) ||
            (c.auteur_compositeur ?? '').toLowerCase().includes(q) ||
            (c.paroles ?? '').toLowerCase().includes(q)
          if (!hit) return false
        }
        if (momentChorale !== 'all' && !c.moment_culte?.includes(momentChorale)) return false
        if (difficulte !== 'all' && c.difficulte !== difficulte) return false
        if (occasion.length > 0 && !occasion.some(o => c.occasion?.includes(o))) return false
        return true
      })
      .sort((a, b) => {
        if (sortChorale === 'utilisation') return b.nb_utilisations - a.nb_utilisations
        if (sortChorale === 'date')       return b.created_at.localeCompare(a.created_at)
        return a.titre.localeCompare(b.titre, 'fr')
      })
  }, [chorale, search, momentChorale, difficulte, occasion, sortChorale])

  const maxUtilGad    = useMemo(() => Math.max(1, ...gad.map(c => c.nb_utilisations)), [gad])
  const maxUtilChorale = useMemo(() => Math.max(1, ...chorale.map(c => c.nb_utilisations)), [chorale])

  const visibleGad    = filteredGad.slice(0, limitGad)
  const visibleChorale = filteredChorale.slice(0, limitChorale)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Onglets principaux ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('gad')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all',
              activeTab === 'gad'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-transparent bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80',
            )}
          >
            <Music className="h-4 w-4" />
            📘 Cantiques GAD
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-[11px] h-5 px-1.5">
              {gad.length}
            </Badge>
          </button>
          <button
            onClick={() => setActiveTab('chorale')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all',
              activeTab === 'chorale'
                ? 'border-amber-500 bg-amber-50 text-amber-700'
                : 'border-transparent bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80',
            )}
          >
            <Users className="h-4 w-4" />
            🎤 Répertoire Chorale
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-[11px] h-5 px-1.5">
              {chorale.length}
            </Badge>
          </button>
        </div>

        {/* Actions droite */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setIsImporting(true)}
          >
            <Download className="h-3.5 w-3.5" />
            Importer CSV
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => { setEditOf(null); setIsAdding(true) }}
          >
            <Plus className="h-3.5 w-3.5" />
            {activeTab === 'gad' ? 'Ajouter GAD' : 'Ajouter Chorale'}
          </Button>
        </div>
      </div>

      {/* ── Barre de recherche + tri ──────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setLimitGad(PAGE_SIZE); setLimitChorale(PAGE_SIZE) }}
            placeholder={
              activeTab === 'gad'
                ? 'Chercher par titre, numéro, auteur ou paroles…'
                : 'Chercher par titre, auteur ou paroles…'
            }
            className="pl-9 h-9"
          />
          {search && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch('')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select
          value={activeTab === 'gad' ? sortGad : sortChorale}
          onValueChange={v => activeTab === 'gad'
            ? setSortGad(v as SortGad)
            : setSortChorale(v as SortChorale)
          }
        >
          <SelectTrigger className="h-9 w-44 text-xs shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(activeTab === 'gad' ? SORT_OPTIONS_GAD : SORT_OPTIONS_CHORALE).map(s => (
              <SelectItem key={s} value={s} className="text-xs">
                {SORT_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Filtres spécifiques à l'onglet ───────────────────────────── */}
      {activeTab === 'gad' ? (
        <div className="flex flex-col gap-2.5">
          <ChipsFilter
            options={MOMENTS_CULTE}
            value={momentGad}
            onChange={v => { setMomentGad(v); setLimitGad(PAGE_SIZE) }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <MultiSelectDropdown
              label="Tonalité"
              options={TONALITES.map(t => ({ value: t, label: t }))}
              selected={tonalite}
              onChange={v => { setTonalite(v); setLimitGad(PAGE_SIZE) }}
            />
            <MultiSelectDropdown
              label="Thèmes"
              options={THEMES_PRESET.map(t => ({ value: t, label: t }))}
              selected={themes}
              onChange={v => { setThemes(v); setLimitGad(PAGE_SIZE) }}
            />
            <div className="flex items-center gap-1.5">
              {TEMPOS.map(t => (
                <Button
                  key={t.value}
                  size="sm"
                  variant={tempo === t.value ? 'default' : 'outline'}
                  className="h-8 px-3 text-xs"
                  onClick={() => { setTempo(tempo === t.value ? 'all' : t.value); setLimitGad(PAGE_SIZE) }}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <ChipsFilter
            options={MOMENTS_CULTE}
            value={momentChorale}
            onChange={v => { setMomentChorale(v); setLimitChorale(PAGE_SIZE) }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              {DIFFICULTES.map(d => (
                <Button
                  key={d.value}
                  size="sm"
                  variant={difficulte === d.value ? 'default' : 'outline'}
                  className="h-8 px-3 text-xs"
                  onClick={() => { setDifficulte(difficulte === d.value ? 'all' : d.value); setLimitChorale(PAGE_SIZE) }}
                >
                  {d.label}
                </Button>
              ))}
            </div>
            <MultiSelectDropdown
              label="Occasion"
              options={OCCASIONS}
              selected={occasion}
              onChange={v => { setOccasion(v); setLimitChorale(PAGE_SIZE) }}
            />
          </div>
        </div>
      )}

      {/* ── Compteur ─────────────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground">
        {activeTab === 'gad'
          ? `${visibleGad.length} affiché${visibleGad.length > 1 ? 's' : ''} sur ${filteredGad.length} cantique${filteredGad.length > 1 ? 's' : ''} GAD`
          : `${visibleChorale.length} affiché${visibleChorale.length > 1 ? 's' : ''} sur ${filteredChorale.length} cantique${filteredChorale.length > 1 ? 's' : ''} Chorale`
        }
      </p>

      {/* ── Grilles ──────────────────────────────────────────────────── */}
      {activeTab === 'gad' ? (
        filteredGad.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Music className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Aucun cantique GAD trouvé.</p>
            <Button size="sm" variant="outline" onClick={() => { setIsAdding(true); setEditOf(null) }}>
              Ajouter le premier cantique GAD ?
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {visibleGad.map(c => (
                <GadCard
                  key={c.id}
                  c={c}
                  maxUtil={maxUtilGad}
                  onParoles={() => setParolesOf(c)}
                  onEdit={() => { setEditOf(c); setIsAdding(true) }}
                  onSetlist={() => handleAddSetlist(c)}
                />
              ))}
            </div>
            {filteredGad.length > limitGad && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setLimitGad(l => l + PAGE_SIZE)}
                >
                  Charger plus
                  <Badge variant="outline" className="text-xs">
                    +{Math.min(PAGE_SIZE, filteredGad.length - limitGad)}
                  </Badge>
                </Button>
              </div>
            )}
          </>
        )
      ) : (
        filteredChorale.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Aucun cantique Chorale trouvé.</p>
            <Button size="sm" variant="outline" onClick={() => { setIsAdding(true); setEditOf(null) }}>
              Ajouter le premier cantique Chorale ?
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {visibleChorale.map(c => (
                <ChoraleCard
                  key={c.id}
                  c={c}
                  maxUtil={maxUtilChorale}
                  onParoles={() => setParolesOf(c)}
                  onEdit={() => { setEditOf(c); setIsAdding(true) }}
                  onSetlist={() => handleAddSetlist(c)}
                />
              ))}
            </div>
            {filteredChorale.length > limitChorale && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setLimitChorale(l => l + PAGE_SIZE)}
                >
                  Charger plus
                  <Badge variant="outline" className="text-xs">
                    +{Math.min(PAGE_SIZE, filteredChorale.length - limitChorale)}
                  </Badge>
                </Button>
              </div>
            )}
          </>
        )
      )}

      {/* ── Paroles Sheet ─────────────────────────────────────────────── */}
      <ParolesSheet
        cantique={parolesOf}
        onClose={() => setParolesOf(null)}
      />

      {/* ── Add / Edit Sheet ──────────────────────────────────────────── */}
      <Sheet open={isAdding} onOpenChange={open => { if (!open) { setIsAdding(false); setEditOf(null) } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editOf
                ? `Modifier · ${editOf.titre}`
                : activeTab === 'gad' ? 'Ajouter un cantique GAD' : 'Ajouter un cantique Chorale'
              }
            </SheetTitle>
            {editOf && (
              <div className="flex items-center justify-between pt-1">
                <SheetDescription>
                  Modifiez les informations du cantique.
                </SheetDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDelete(editOf)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </Button>
              </div>
            )}
          </SheetHeader>
          <SheetBody>
            <CantiquesForm
              categorie={editOf?.categorie ?? activeTab}
              editing={editOf}
              onDone={() => { setIsAdding(false); setEditOf(null); refresh() }}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* ── Import CSV Sheet ──────────────────────────────────────────── */}
      <ImportCsvSheet
        open={isImporting}
        onClose={() => setIsImporting(false)}
      />

    </div>
  )
}
