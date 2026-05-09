'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createCantiqueAction, updateCantiqueAction } from '@/app/projection/cantiques/actions'
import type { Cantique } from '@/app/projection/cantiques/CantiquesClient'

// ── Constants ──────────────────────────────────────────────────────────────

const TONALITES = [
  'Do', 'Do m', 'Ré', 'Ré m', 'Mi', 'Mi m',
  'Fa', 'Fa m', 'Sol', 'Sol m', 'La', 'La m', 'Si', 'Si m',
]

const MOMENTS_CULTE = [
  { value: 'adoration',   label: 'Adoration' },
  { value: 'louange',     label: 'Louange' },
  { value: 'offertoire',  label: 'Offertoire' },
  { value: 'communion',   label: 'Communion' },
  { value: 'envoi',       label: 'Envoi' },
  { value: 'special',     label: 'Spécial' },
]

const TEMPOS = [
  { value: 'lent',     label: 'Lent' },
  { value: 'moderato', label: 'Modéré' },
  { value: 'vif',      label: 'Vif' },
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

// ── Sub-components ─────────────────────────────────────────────────────────

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
}

function ChipsSelect({
  label,
  options,
  value,
  onChange,
}: {
  label:    string
  options:  { value: string; label: string }[]
  value:    string[]
  onChange: (v: string[]) => void
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

function TagsInput({
  label,
  hint,
  value,
  onChange,
  presets,
}: {
  label:    string
  hint?:    string
  value:    string[]
  onChange: (v: string[]) => void
  presets?: string[]
}) {
  const [input, setInput] = useState('')

  function add(raw: string) {
    const tag = raw.trim().toLowerCase()
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setInput('')
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}

      {presets && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => value.includes(p) ? onChange(value.filter(v => v !== p)) : onChange([...value, p])}
              className={cn(
                'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                value.includes(p)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground border-border',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
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
          placeholder={`Ajouter un thème… (Entrée pour valider)`}
          className="h-8 text-xs"
        />
        <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={() => add(input)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── CantiqueForm ───────────────────────────────────────────────────────────

function CantiqueForm({
  cantique,
  onDone,
}: {
  cantique: Cantique | null | undefined
  onDone:   () => void
}) {
  const [loading,    setLoading]    = useState(false)
  const [err,        setErr]        = useState<string | null>(null)

  // Catégorie — pilote les champs conditionnels
  const [categorie,  setCategorie]  = useState<'gad' | 'chorale'>(cantique?.categorie ?? 'gad')

  // Champs communs
  const [titre,      setTitre]      = useState(cantique?.titre                ?? '')
  const [sousTitre,  setSousTitre]  = useState(cantique?.sous_titre           ?? '')
  const [auteur,     setAuteur]     = useState(cantique?.auteur_compositeur   ?? '')
  const [tonalite,   setTonalite]   = useState(cantique?.tonalite             ?? '')
  const [moments,    setMoments]    = useState<string[]>(cantique?.moment_culte ?? [])
  const [themes,     setThemes]     = useState<string[]>(cantique?.themes       ?? [])
  const [paroles,    setParoles]    = useState(cantique?.paroles               ?? '')
  const [partition,  setPartition]  = useState(cantique?.lien_partition        ?? '')
  const [audio,      setAudio]      = useState(cantique?.lien_audio            ?? '')
  const [notes,      setNotes]      = useState(cantique?.notes                 ?? '')
  const [actif,      setActif]      = useState(cantique?.actif                 ?? true)

  // GAD spécifique
  const [numeroGad,  setNumeroGad]  = useState(cantique?.numero_gad ?? '')
  const [tempo,      setTempo]      = useState(cantique?.tempo       ?? '')

  // Chorale spécifique
  const [difficulte, setDifficulte] = useState(cantique?.difficulte ?? '')
  const [occasion,   setOccasion]   = useState<string[]>(cantique?.occasion ?? [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titre.trim()) { setErr('Le titre est obligatoire.'); return }
    setLoading(true)
    setErr(null)

    const payload = {
      categorie,
      titre:               titre.trim(),
      sous_titre:          sousTitre.trim()   || null,
      auteur_compositeur:  auteur.trim()      || null,
      tonalite:            tonalite           || null,
      moment_culte:        moments.length > 0  ? moments : null,
      themes:              themes.length > 0   ? themes  : null,
      paroles:             paroles.trim()     || null,
      lien_partition:      partition.trim()   || null,
      lien_audio:          audio.trim()       || null,
      notes:               notes.trim()       || null,
      actif,
      // GAD
      numero_gad: categorie === 'gad'    ? (numeroGad.trim() || null) : null,
      tempo:      categorie === 'gad'    ? (tempo             || null) : null,
      // Chorale
      difficulte: categorie === 'chorale' ? (difficulte       || null) : null,
      occasion:   categorie === 'chorale' ? (occasion.length > 0 ? occasion : null) : null,
    }

    try {
      const result = cantique
        ? await updateCantiqueAction(cantique.id, payload)
        : await createCantiqueAction(payload)
      if (result?.error) { setErr(result.error); return }
      toast.success(cantique ? 'Cantique mis à jour' : 'Cantique ajouté')
      onDone()
    } catch (e) {
      setErr(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Catégorie */}
      <div className="space-y-1.5">
        <Label htmlFor="categorie">Catégorie *</Label>
        <div className="flex gap-2">
          {(['gad', 'chorale'] as const).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategorie(cat)}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all',
                categorie === cat && cat === 'gad'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : categorie === cat && cat === 'chorale'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {cat === 'gad' ? '📘 GAD' : '🎤 Chorale'}
            </button>
          ))}
        </div>
      </div>

      {/* Champs GAD spécifiques */}
      {categorie === 'gad' && (
        <FieldRow>
          <div className="space-y-1.5">
            <Label htmlFor="numero_gad">Numéro GAD</Label>
            <Input
              id="numero_gad"
              value={numeroGad}
              onChange={e => setNumeroGad(e.target.value)}
              placeholder="ex : 245, 12b…"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tempo">Tempo</Label>
            <Select value={tempo} onValueChange={setTempo}>
              <SelectTrigger id="tempo" className="h-8 text-sm">
                <SelectValue placeholder="— Choisir —" />
              </SelectTrigger>
              <SelectContent>
                {TEMPOS.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FieldRow>
      )}

      {/* Champs Chorale spécifiques */}
      {categorie === 'chorale' && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="sous_titre">Sous-titre</Label>
            <Input
              id="sous_titre"
              value={sousTitre}
              onChange={e => setSousTitre(e.target.value)}
              placeholder="Sous-titre optionnel…"
              className="h-8 text-sm"
            />
          </div>
          <FieldRow>
            <div className="space-y-1.5">
              <Label htmlFor="difficulte">Difficulté</Label>
              <Select value={difficulte} onValueChange={setDifficulte}>
                <SelectTrigger id="difficulte" className="h-8 text-sm">
                  <SelectValue placeholder="— Choisir —" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTES.map(d => (
                    <SelectItem key={d.value} value={d.value} className="text-sm">{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>{/* spacer */}</div>
          </FieldRow>
          <ChipsSelect
            label="Occasion(s)"
            options={OCCASIONS}
            value={occasion}
            onChange={setOccasion}
          />
        </>
      )}

      {/* Titre */}
      <div className="space-y-1.5">
        <Label htmlFor="titre">Titre *</Label>
        <Input
          id="titre"
          value={titre}
          onChange={e => setTitre(e.target.value)}
          placeholder="Titre du cantique"
          required
          className="h-9 text-sm"
        />
      </div>

      {/* Auteur + Tonalité */}
      <FieldRow>
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
        <div className="space-y-1.5">
          <Label htmlFor="tonalite">Tonalité</Label>
          <Select value={tonalite} onValueChange={setTonalite}>
            <SelectTrigger id="tonalite" className="h-8 text-sm">
              <SelectValue placeholder="— Choisir —" />
            </SelectTrigger>
            <SelectContent>
              {TONALITES.map(t => (
                <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FieldRow>

      {/* Moments du culte */}
      <ChipsSelect
        label="Moment(s) du culte"
        options={MOMENTS_CULTE}
        value={moments}
        onChange={setMoments}
      />

      {/* Thèmes */}
      <TagsInput
        label="Thèmes"
        hint="Cliquez sur les suggestions ou appuyez sur Entrée pour ajouter un thème libre."
        value={themes}
        onChange={setThemes}
        presets={THEMES_PRESET}
      />

      {/* Paroles */}
      <div className="space-y-1.5">
        <Label htmlFor="paroles">
          Paroles
          <span className="ml-2 text-[11px] font-normal text-muted-foreground">
            Tapez &laquo;&nbsp;Refrain :&nbsp;&raquo; ou &laquo;&nbsp;Couplet 1 :&nbsp;&raquo; pour marquer les sections
          </span>
        </Label>
        <Textarea
          id="paroles"
          value={paroles}
          onChange={e => setParoles(e.target.value)}
          placeholder={`Couplet 1 :\nPremière ligne du couplet\nDeuxième ligne\n\nRefrain :\nLigne du refrain…`}
          rows={8}
          className="text-sm font-mono resize-y leading-relaxed"
        />
      </div>

      {/* Liens */}
      <FieldRow>
        <div className="space-y-1.5">
          <Label htmlFor="partition">
            <span className="mr-1">📄</span> Lien partition
          </Label>
          <Input
            id="partition"
            value={partition}
            onChange={e => setPartition(e.target.value)}
            placeholder="https://drive.google.com/…"
            type="url"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audio">
            <span className="mr-1">🔊</span> Lien audio
          </Label>
          <Input
            id="audio"
            value={audio}
            onChange={e => setAudio(e.target.value)}
            placeholder="https://…"
            type="url"
            className="h-8 text-sm"
          />
        </div>
      </FieldRow>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes internes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Informations utiles pour l'équipe…"
          rows={2}
          className="text-sm resize-y"
        />
      </div>

      {/* Actif */}
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <Switch id="actif" checked={actif} onCheckedChange={setActif} />
        <div>
          <Label htmlFor="actif" className="cursor-pointer">Cantique actif</Label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Les cantiques inactifs n&apos;apparaissent pas dans la recherche rapide
          </p>
        </div>
      </div>

      {/* Erreur */}
      {err && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          {err}
        </p>
      )}

      {/* Boutons */}
      <div className="flex gap-2 pt-1 sticky bottom-0 bg-background pb-1">
        <Button type="button" variant="outline" onClick={onDone} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {loading
            ? 'Enregistrement…'
            : cantique ? 'Mettre à jour' : 'Ajouter le cantique'
          }
        </Button>
      </div>
    </form>
  )
}

// ── CantiqueModal (export principal) ───────────────────────────────────────

interface CantiqueModalProps {
  open:              boolean
  onOpenChange:      (open: boolean) => void
  cantique?:         Cantique | null
  defaultCategorie?: 'gad' | 'chorale'
  onSuccess?:        () => void
}

export function CantiqueModal({
  open,
  onOpenChange,
  cantique,
  onSuccess,
}: CantiqueModalProps) {
  const isEdit = !!cantique

  function handleDone() {
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[92vh] overflow-y-auto p-0"
      >
        {/* En-tête sticky */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEdit ? (
                <>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[11px] font-bold px-1.5',
                      cantique.categorie === 'gad'
                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                        : 'bg-amber-100 text-amber-700 border-amber-200',
                    )}
                  >
                    {cantique.categorie === 'gad' ? 'GAD' : 'CHORALE'}
                  </Badge>
                  Modifier le cantique
                </>
              ) : (
                'Ajouter un cantique'
              )}
            </DialogTitle>
            {isEdit && cantique.titre && (
              <DialogDescription className="truncate">
                {cantique.titre}
              </DialogDescription>
            )}
          </DialogHeader>
        </div>

        {/* Corps du formulaire */}
        <div className="px-6 py-4">
          <CantiqueForm
            cantique={cantique}
            onDone={handleDone}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
