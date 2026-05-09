'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus, Edit3, Printer, Copy, Music2, Mic2,
  ListMusic, Loader2, ChevronRight, AlertCircle,
} from 'lucide-react'
import { createSetlistAction } from './actions'

// ── Types ───────────────────────────────────────────────────────────────────

export type CantiqueBrief = {
  id:         string
  categorie:  'gad' | 'chorale'
  numero_gad: string | null
  titre:      string
}

export type SetlistItem = {
  id:        string
  position:  number
  cantiques: CantiqueBrief | null
}

export type Culte = {
  id:          string
  date_culte:  string
  theme:       string | null
  predicateur: string | null
}

export type Setlist = {
  id:            string
  statut:        'brouillon' | 'valide' | 'utilise'
  titre_setlist: string | null
  culte_id:      string | null
  notes:         string | null
  created_at:    string
  cultes:        Culte | null
  setlist_items: SetlistItem[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDateLongue(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatMois(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-')
  const d = new Date(parseInt(y), parseInt(m) - 1, 1)
  return capitalize(d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
}

function setlistTitre(s: Setlist): string {
  return s.titre_setlist
    ?? (s.cultes?.date_culte
      ? capitalize(formatDateLongue(s.cultes.date_culte))
      : 'Setlist sans titre')
}

const STATUT_CONFIG: Record<string, { label: string; badge: string }> = {
  brouillon: { label: 'Brouillon', badge: 'bg-muted text-muted-foreground border-border' },
  valide:    { label: 'Validée',   badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  utilise:   { label: 'Utilisée',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

const FILTRE_OPTIONS = [
  { value: 'toutes',    label: 'Toutes' },
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'valide',    label: 'Validée' },
  { value: 'utilise',   label: 'Utilisée' },
] as const

type FiltreStatut = typeof FILTRE_OPTIONS[number]['value']

// ── SetlistCard ──────────────────────────────────────────────────────────────

function SetlistCard({
  setlist,
  onDuplicate,
}: {
  setlist:     Setlist
  onDuplicate: (s: Setlist) => void
}) {
  const items      = Array.isArray(setlist.setlist_items) ? setlist.setlist_items : []
  const statut     = STATUT_CONFIG[setlist.statut] ?? STATUT_CONFIG.brouillon
  const titre      = setlistTitre(setlist)
  const culte      = setlist.cultes
  const nbGad      = items.filter(i => i.cantiques?.categorie === 'gad').length
  const nbChorale  = items.filter(i => i.cantiques?.categorie === 'chorale').length

  const sortedItems = [...items].sort((a, b) => a.position - b.position)

  return (
    <Card>
      <CardContent className="p-0">

        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-base leading-tight truncate">{titre}</p>
              {culte?.theme && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {culte.theme}
                  {culte.predicateur && ` · Préd. ${culte.predicateur}`}
                </p>
              )}
            </div>
            <Badge
              variant="outline"
              className={`shrink-0 text-[11px] px-2 py-0.5 ${statut.badge}`}
            >
              {statut.label}
            </Badge>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ListMusic className="h-3.5 w-3.5" />
              {items.length} cantique{items.length !== 1 ? 's' : ''}
            </span>
            {nbGad > 0 && (
              <span className="flex items-center gap-1">
                <Music2 className="h-3.5 w-3.5 text-blue-500" />
                {nbGad} GAD
              </span>
            )}
            {nbChorale > 0 && (
              <span className="flex items-center gap-1">
                <Mic2 className="h-3.5 w-3.5 text-amber-500" />
                {nbChorale} Chorale
              </span>
            )}
          </div>
        </div>

        {/* Cantiques scrollable badges */}
        {sortedItems.length > 0 ? (
          <div className="px-4 py-3 overflow-x-auto flex gap-1.5 border-b"
               style={{ scrollbarWidth: 'none' }}>
            {sortedItems.map((item) => {
              const c = item.cantiques
              if (!c) return null
              const isGad = c.categorie === 'gad'
              return (
                <Badge
                  key={item.id}
                  variant="outline"
                  className={`shrink-0 text-[11px] gap-1 py-0.5 whitespace-nowrap ${
                    isGad
                      ? 'border-blue-200 bg-blue-50/50 text-blue-700'
                      : 'border-amber-200 bg-amber-50/50 text-amber-700'
                  }`}
                >
                  <span className="font-mono font-medium">
                    {isGad ? (c.numero_gad ?? '#') : '🎤'}
                  </span>
                  <span className="max-w-[100px] truncate block">{c.titre}</span>
                </Badge>
              )
            })}
          </div>
        ) : (
          <div className="px-4 py-3 border-b">
            <p className="text-xs text-muted-foreground italic">Aucun cantique ajouté</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-4 py-3 flex gap-2 flex-wrap">
          <Link href={`/projection/setlists/${setlist.id}/edit`}>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
              <Edit3 className="h-3.5 w-3.5" />
              Modifier la setlist
            </Button>
          </Link>
          <Link href={`/projection/setlists/${setlist.id}`} target="_blank">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
              <Printer className="h-3.5 w-3.5" />
              Voir / Imprimer
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8"
            onClick={() => onDuplicate(setlist)}
          >
            <Copy className="h-3.5 w-3.5" />
            Dupliquer
          </Button>
        </div>

      </CardContent>
    </Card>
  )
}

// ── CreateSetlistDialog ──────────────────────────────────────────────────────

function CreateSetlistDialog({
  open,
  onOpenChange,
  prochainsCultes,
  cultesDisponibles,
}: {
  open:              boolean
  onOpenChange:      (v: boolean) => void
  prochainsCultes:   Culte[]
  cultesDisponibles: Culte[]
}) {
  const router = useRouter()
  const [culteId, setCulteId] = useState<string>('__sans__')
  const [titre, setTitre]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  function reset() {
    setCulteId('__sans__')
    setTitre('')
    setError(null)
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  async function handleCreate() {
    setError(null)
    setLoading(true)
    try {
      const res = await createSetlistAction({
        culte_id:      culteId === '__sans__' ? null : culteId,
        titre_setlist: culteId === '__sans__' ? (titre.trim() || null) : null,
      })
      if (res.error) { setError(res.error); return }
      handleOpenChange(false)
      router.push(`/projection/setlists/${res.id}/edit`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer une setlist</DialogTitle>
          <DialogDescription>
            Associez cette setlist à un culte ou créez-la sans date définie.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          <div className="space-y-1.5">
            <Label htmlFor="create-culte-select">Culte associé</Label>
            <Select value={culteId} onValueChange={setCulteId}>
              <SelectTrigger id="create-culte-select">
                <SelectValue placeholder="Sélectionner un culte…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__sans__">— Sans culte associé —</SelectItem>
                {cultesDisponibles.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {capitalize(formatDateLongue(c.date_culte))}
                    {c.theme ? ` · ${c.theme}` : ''}
                  </SelectItem>
                ))}
                {cultesDisponibles.length === 0 && prochainsCultes.length > 0 && (
                  <SelectItem value="__none__" disabled>
                    Tous les prochains cultes ont déjà une setlist
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {prochainsCultes.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Aucun culte planifié à venir — vous pouvez créer une setlist sans culte.
              </p>
            )}
          </div>

          {culteId === '__sans__' && (
            <div className="space-y-1.5">
              <Label htmlFor="create-titre">
                Titre{' '}
                <span className="text-muted-foreground font-normal">(optionnel)</span>
              </Label>
              <Input
                id="create-titre"
                value={titre}
                onChange={e => setTitre(e.target.value)}
                placeholder="ex : Culte jeunesse mars 2025"
              />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={loading} className="gap-2">
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <ChevronRight className="h-4 w-4" />}
            Créer et ouvrir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── DupliquerDialog ──────────────────────────────────────────────────────────

function DupliquerDialog({
  setlist,
  open,
  onOpenChange,
  cultesDisponibles,
  onSuccess,
}: {
  setlist:           Setlist | null
  open:              boolean
  onOpenChange:      (v: boolean) => void
  cultesDisponibles: Culte[]
  onSuccess:         (newId: string) => void
}) {
  const [culteId, setCulteId] = useState<string>('__sans__')
  const [titre, setTitre]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  function reset() {
    setCulteId('__sans__')
    setTitre('')
    setError(null)
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  async function handleDuplicate() {
    if (!setlist) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/projection/setlists/dupliquer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          setlist_id:     setlist.id,
          culte_id_cible: culteId === '__sans__' ? null : culteId,
          titre_setlist:  culteId === '__sans__' ? (titre.trim() || null) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setError(json.error ?? 'Erreur inconnue'); return }
      handleOpenChange(false)
      onSuccess(json.id)
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const sourceTitre = setlist ? setlistTitre(setlist) : ''

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dupliquer la setlist</DialogTitle>
          <DialogDescription>
            Copie de &laquo;&nbsp;{sourceTitre}&nbsp;&raquo; vers un nouveau culte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          <div className="space-y-1.5">
            <Label htmlFor="dup-culte-select">Culte de destination</Label>
            <Select value={culteId} onValueChange={setCulteId}>
              <SelectTrigger id="dup-culte-select">
                <SelectValue placeholder="Sélectionner un culte…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__sans__">— Sans culte associé —</SelectItem>
                {cultesDisponibles.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {capitalize(formatDateLongue(c.date_culte))}
                    {c.theme ? ` · ${c.theme}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {culteId === '__sans__' && (
            <div className="space-y-1.5">
              <Label htmlFor="dup-titre">
                Titre de la copie{' '}
                <span className="text-muted-foreground font-normal">(optionnel)</span>
              </Label>
              <Input
                id="dup-titre"
                value={titre}
                onChange={e => setTitre(e.target.value)}
                placeholder={`Copie de ${sourceTitre}`}
              />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleDuplicate} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <Copy className="h-4 w-4" />
            Dupliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── SetlistsClient ───────────────────────────────────────────────────────────

export default function SetlistsClient({
  setlists,
  prochainsCultes,
}: {
  setlists:        Setlist[]
  prochainsCultes: Culte[]
}) {
  const router = useRouter()

  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>('toutes')
  const [filtreMois, setFiltreMois]     = useState<string>('')
  const [isCreating, setIsCreating]     = useState(false)
  const [dupSetlist, setDupSetlist]     = useState<Setlist | null>(null)
  const [isDupOpen, setIsDupOpen]       = useState(false)

  // ── Derived data ────────────────────────────────────────────────────────

  const cultesAvecSetlistIds = useMemo(() => {
    const ids = new Set<string>()
    for (const s of setlists) {
      if (s.culte_id) ids.add(s.culte_id)
    }
    return ids
  }, [setlists])

  const cultesDisponibles = useMemo(
    () => prochainsCultes.filter(c => !cultesAvecSetlistIds.has(c.id)),
    [prochainsCultes, cultesAvecSetlistIds],
  )

  const moisOptions = useMemo(() => {
    const set = new Set<string>()
    for (const s of setlists) {
      const dateStr = s.cultes?.date_culte ?? s.created_at
      if (dateStr) set.add(dateStr.slice(0, 7))
    }
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [setlists])

  const filtered = useMemo(() => {
    return setlists.filter(s => {
      if (filtreStatut !== 'toutes' && s.statut !== filtreStatut) return false
      if (filtreMois) {
        const dateStr = s.cultes?.date_culte ?? s.created_at
        if (!dateStr?.startsWith(filtreMois)) return false
      }
      return true
    })
  }, [setlists, filtreStatut, filtreMois])

  const sorted = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const upcoming = filtered
      .filter(s => s.cultes?.date_culte && s.cultes.date_culte >= todayStr)
      .sort((a, b) => a.cultes!.date_culte.localeCompare(b.cultes!.date_culte))
    const past = filtered
      .filter(s => s.cultes?.date_culte && s.cultes.date_culte < todayStr)
      .sort((a, b) => b.cultes!.date_culte.localeCompare(a.cultes!.date_culte))
    const noDate = filtered
      .filter(s => !s.cultes?.date_culte)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    return [...upcoming, ...past, ...noDate]
  }, [filtered])

  // ── Handlers ─────────────────────────────────────────────────────────────

  function openDuplicate(s: Setlist) {
    setDupSetlist(s)
    setIsDupOpen(true)
  }

  function handleDupSuccess(newId: string) {
    router.push(`/projection/setlists/${newId}/edit`)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">

        <Button className="gap-2" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4" />
          Créer une setlist
        </Button>

        <div className="flex-1" />

        {/* Status filter */}
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/30 p-1">
          {FILTRE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFiltreStatut(opt.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filtreStatut === opt.value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Month filter */}
        {moisOptions.length > 1 && (
          <Select value={filtreMois} onValueChange={setFiltreMois}>
            <SelectTrigger className="w-48 h-9 text-sm">
              <SelectValue placeholder="Tous les mois" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les mois</SelectItem>
              {moisOptions.map(m => (
                <SelectItem key={m} value={m}>{formatMois(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ── Results count ─────────────────────────────────────────────────── */}
      {setlists.length > 0 && sorted.length > 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          {sorted.length} setlist{sorted.length > 1 ? 's' : ''}
          {(filtreStatut !== 'toutes' || filtreMois) ? ' (filtrées)' : ''}
        </p>
      )}

      {/* ── Setlist cards ─────────────────────────────────────────────────── */}
      {sorted.length > 0 ? (
        <div className="space-y-4">
          {sorted.map(s => (
            <SetlistCard
              key={s.id}
              setlist={s}
              onDuplicate={openDuplicate}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted">
              <ListMusic className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">
                {setlists.length === 0
                  ? 'Aucune setlist créée'
                  : 'Aucune setlist correspond aux filtres'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {setlists.length === 0
                  ? 'Commencez par créer une setlist pour un prochain culte.'
                  : 'Modifiez les filtres pour voir d\'autres résultats.'}
              </p>
            </div>
            {setlists.length === 0 && (
              <Button className="gap-2 mt-2" onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4" />
                Créer une setlist
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}
      <CreateSetlistDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        prochainsCultes={prochainsCultes}
        cultesDisponibles={cultesDisponibles}
      />

      <DupliquerDialog
        setlist={dupSetlist}
        open={isDupOpen}
        onOpenChange={(v) => {
          setIsDupOpen(v)
          if (!v) setDupSetlist(null)
        }}
        cultesDisponibles={cultesDisponibles}
        onSuccess={handleDupSuccess}
      />
    </>
  )
}
