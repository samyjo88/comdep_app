'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DragDropContext, Droppable, Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, GripVertical, Plus, Trash2, Save, Eye,
  CheckCircle2, Loader2, Music2, Mic2, Star, Search,
  Check, AlertCircle, BookOpenText,
} from 'lucide-react'
import { toast } from 'sonner'
import { capitalize, formatDateLong } from '@/lib/utils'
import {
  addSetlistItemAction,
  removeSetlistItemAction,
  reorderSetlistItemsAction,
  updateSetlistItemAction,
  updateSetlistStatusAction,
} from './actions'

export type LibCantique = {
  id:              string
  categorie:       'gad' | 'chorale'
  numero_gad:      string | null
  titre:           string
  tonalite:        string | null
  moment_culte:    string[] | null
  nb_utilisations: number
}

export type SetlistItemFull = {
  id:                string
  position:          number
  cantique_id:       string
  moment_culte:      string | null
  tonalite_utilisee: string | null
  notes_operateur:   string | null
  cantiques:         LibCantique
}

export type SetlistFull = {
  id:            string
  statut:        'brouillon' | 'valide' | 'utilise'
  titre_setlist: string | null
  culte_id:      string | null
  notes:         string | null
  cultes: {
    id:          string
    date_culte:  string
    theme:       string | null
    predicateur: string | null
  } | null
  setlist_items: SetlistItemFull[]
}

const MOMENTS_CULTE = [
  { value: 'adoration',  label: 'Adoration' },
  { value: 'louange',    label: 'Louange' },
  { value: 'offertoire', label: 'Offertoire' },
  { value: 'communion',  label: 'Communion' },
  { value: 'envoi',      label: 'Envoi' },
  { value: 'special',    label: 'Spécial' },
]

const TONALITES = [
  'Do', 'Do m', 'Ré', 'Ré m', 'Mi', 'Mi m',
  'Fa', 'Fa m', 'Sol', 'Sol m', 'La', 'La m', 'Si', 'Si m',
]

const STATUT_CONFIG = {
  brouillon: { label: 'Brouillon', badge: 'bg-muted text-muted-foreground border-border' },
  valide:    { label: 'Validée',   badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  utilise:   { label: 'Utilisée',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

function LibCantiqueRow({
  cantique,
  alreadyAdded,
  adding,
  onAdd,
}: {
  cantique:    LibCantique
  alreadyAdded: boolean
  adding:      boolean
  onAdd:       (c: LibCantique) => void
}) {
  const isGad = cantique.categorie === 'gad'

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors ${
        alreadyAdded
          ? 'opacity-50 bg-muted/20 cursor-not-allowed'
          : 'bg-card hover:bg-muted/40'
      }`}
    >
      <span
        className={`shrink-0 text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded ${
          isGad ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
        }`}
      >
        {isGad ? (cantique.numero_gad ?? 'GAD') : '🎤'}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{cantique.titre}</p>
        {cantique.tonalite && (
          <p className="text-xs text-muted-foreground mt-0.5">{cantique.tonalite}</p>
        )}
      </div>

      {alreadyAdded ? (
        <span className="text-[10px] text-muted-foreground shrink-0 italic">Déjà ajouté</span>
      ) : (
        <button
          onClick={() => onAdd(cantique)}
          disabled={adding}
          className="shrink-0 h-11 w-11 md:h-7 md:w-7 flex items-center justify-center rounded-md border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors disabled:opacity-50"
        >
          {adding
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Plus className="h-4 w-4 md:h-3.5 md:w-3.5" />
          }
        </button>
      )}
    </div>
  )
}

function SetlistItemRow({
  item,
  index,
  dragHandleProps,
  removing,
  flash,
  onRemove,
  onFieldChange,
}: {
  item:            SetlistItemFull
  index:           number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragHandleProps: any
  removing:        boolean
  flash:           boolean
  onRemove:        (id: string) => void
  onFieldChange:   (id: string, field: string, value: string | null) => void
}) {
  const c     = item.cantiques
  const isGad = c?.categorie === 'gad'

  return (
    <div
      className={`flex items-start gap-2 px-3 py-3 bg-card rounded-lg border transition-all duration-500 ${
        flash ? 'ring-2 ring-green-400 bg-green-50 dark:bg-green-950/20' : ''
      } ${removing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
    >
      <div
        {...dragHandleProps}
        className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <span className="mt-0.5 text-xs font-mono text-muted-foreground w-5 shrink-0 text-right">
        #{index + 1}
      </span>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`shrink-0 text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded ${
              isGad ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isGad ? (c.numero_gad ?? 'GAD') : '🎤'}
          </span>
          <span className="text-sm font-semibold truncate">{c?.titre ?? '—'}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={item.tonalite_utilisee ?? '__none__'}
            onValueChange={v => onFieldChange(item.id, 'tonalite_utilisee', v === '__none__' ? null : v)}
          >
            <SelectTrigger className="h-7 w-[115px] text-xs px-2">
              <SelectValue placeholder="Tonalité…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Tonalité —</SelectItem>
              {TONALITES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={item.moment_culte ?? '__none__'}
            onValueChange={v => onFieldChange(item.id, 'moment_culte', v === '__none__' ? null : v)}
          >
            <SelectTrigger className="h-7 w-[130px] text-xs px-2">
              <SelectValue placeholder="Moment…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Moment —</SelectItem>
              {MOMENTS_CULTE.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={item.notes_operateur ?? ''}
            onChange={e => onFieldChange(item.id, 'notes_operateur', e.target.value || null)}
            placeholder="Notes opérateur…"
            className="h-7 text-xs flex-1 min-w-[140px]"
          />
        </div>
      </div>

      <button
        onClick={() => onRemove(item.id)}
        disabled={removing}
        className="mt-0.5 shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
      >
        {removing
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Trash2 className="h-3.5 w-3.5" />
        }
      </button>
    </div>
  )
}

type SaveState = 'saved' | 'saving' | 'unsaved'
type LibTab    = 'gad' | 'chorale' | 'frequents'
type MobileTab = 'library' | 'setlist'

export default function EditClient({
  setlist,
  libGad,
  libChorale,
  libFrequents,
}: {
  setlist:      SetlistFull
  libGad:       LibCantique[]
  libChorale:   LibCantique[]
  libFrequents: LibCantique[]
}) {
  const router = useRouter()

  const [items, setItems] = useState<SetlistItemFull[]>(
    [...setlist.setlist_items].sort((a, b) => a.position - b.position),
  )
  const [statut, setStatut] = useState(setlist.statut)

  const [saveState, setSaveState]   = useState<SaveState>('saved')
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [validating, setValidating] = useState(false)

  const [addingId,    setAddingId]    = useState<string | null>(null)
  const [removingId,  setRemovingId]  = useState<string | null>(null)
  const [flashItemId, setFlashItemId] = useState<string | null>(null)

  const [libTab, setLibTab]         = useState<LibTab>('gad')
  const [libSearch, setLibSearch]   = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [libMoment, setLibMoment]   = useState('')

  const [mobileTab, setMobileTab] = useState<MobileTab>('library')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingRef     = useRef<Map<string, Record<string, any>>>(new Map())
  const saveTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addedIds = useMemo(() => new Set(items.map(i => i.cantique_id)), [items])

  const libSource = libTab === 'gad' ? libGad : libTab === 'chorale' ? libChorale : libFrequents

  const libFiltered = useMemo(() => {
    let src = libSource
    if (debouncedQ.trim()) {
      const q = debouncedQ.toLowerCase()
      src = src.filter(c =>
        c.titre.toLowerCase().includes(q) ||
        (c.numero_gad ?? '').toLowerCase().includes(q),
      )
    }
    if (libMoment) {
      src = src.filter(c => Array.isArray(c.moment_culte) && c.moment_culte.includes(libMoment))
    }
    return src
  }, [libSource, debouncedQ, libMoment])

  const stats = useMemo(() => ({
    total:   items.length,
    gad:     items.filter(i => i.cantiques?.categorie === 'gad').length,
    chorale: items.filter(i => i.cantiques?.categorie === 'chorale').length,
  }), [items])

  const culte     = setlist.cultes
  const pageTitle = setlist.titre_setlist
    ?? (culte?.date_culte
      ? capitalize(formatDateLong(culte.date_culte))
      : 'Setlist sans titre')

  const flushPendingChanges = useCallback(async () => {
    if (pendingRef.current.size === 0) return
    setSaveState('saving')
    setSaveError(null)
    const entries = Array.from(pendingRef.current.entries())
    pendingRef.current.clear()
    const results = await Promise.all(
      entries.map(([itemId, fields]) => updateSetlistItemAction(itemId, fields)),
    )
    const failed = results.find(r => r.error)
    if (failed?.error) {
      setSaveError(failed.error)
      setSaveState('unsaved')
    } else {
      setSaveState('saved')
    }
  }, [])

  const scheduleSave = useCallback(() => {
    setSaveState('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => { flushPendingChanges() }, 1500)
  }, [flushPendingChanges])

  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingRef.current.size > 0) flushPendingChanges()
    }, 30_000)
    return () => clearInterval(interval)
  }, [flushPendingChanges])

  function handleSearchChange(v: string) {
    setLibSearch(v)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setDebouncedQ(v), 300)
  }

  async function handleAdd(cantique: LibCantique) {
    if (addedIds.has(cantique.id) || addingId) return
    setAddingId(cantique.id)
    setSaveError(null)

    const position = items.length + 1
    const res = await addSetlistItemAction({
      setlist_id:        setlist.id,
      cantique_id:       cantique.id,
      position,
      moment_culte:      Array.isArray(cantique.moment_culte) ? cantique.moment_culte[0] ?? null : null,
      tonalite_utilisee: cantique.tonalite ?? null,
    })

    if (res.error) {
      setSaveError(res.error)
    } else {
      const newItem: SetlistItemFull = {
        id:                res.id!,
        position,
        cantique_id:       cantique.id,
        moment_culte:      Array.isArray(cantique.moment_culte) ? cantique.moment_culte[0] ?? null : null,
        tonalite_utilisee: cantique.tonalite ?? null,
        notes_operateur:   null,
        cantiques:         cantique,
      }
      setItems(prev => [...prev, newItem])
      setSaveState('saved')
      toast.success(`${cantique.titre} ajouté à la setlist ✓`)
      setFlashItemId(res.id!)
      setTimeout(() => setFlashItemId(null), 1200)
      setMobileTab('setlist')
    }
    setAddingId(null)
  }

  async function handleRemove(itemId: string) {
    if (removingId) return
    setRemovingId(itemId)
    setSaveError(null)

    await new Promise(r => setTimeout(r, 200))

    const res = await removeSetlistItemAction(itemId)
    if (res.error) {
      setSaveError(res.error)
      setRemovingId(null)
      return
    }

    setItems(prev => {
      const filtered  = prev.filter(i => i.id !== itemId)
      const reordered = filtered.map((item, idx) => ({ ...item, position: idx + 1 }))
      if (reordered.length > 0) {
        reorderSetlistItemsAction(reordered.map(i => ({ id: i.id, position: i.position })))
      }
      return reordered
    })
    setSaveState('saved')
    setRemovingId(null)
  }

  function handleDragEnd(result: DropResult) {
    const { source, destination } = result
    if (!destination || source.index === destination.index) return

    setItems(prev => {
      const reordered = Array.from(prev)
      const [moved]   = reordered.splice(source.index, 1)
      reordered.splice(destination.index, 0, moved)
      const withPositions = reordered.map((item, idx) => ({ ...item, position: idx + 1 }))

      setSaveState('saving')
      reorderSetlistItemsAction(withPositions.map(i => ({ id: i.id, position: i.position })))
        .then(res => setSaveState(res.error ? 'unsaved' : 'saved'))

      return withPositions
    })
  }

  function handleFieldChange(itemId: string, field: string, value: string | null) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: value } : i))
    const pending = pendingRef.current.get(itemId) ?? {}
    pendingRef.current.set(itemId, { ...pending, [field]: value })
    scheduleSave()
  }

  async function handleValidate() {
    setValidating(true)
    const newStatut = statut === 'brouillon' ? 'valide' : 'brouillon'
    const res = await updateSetlistStatusAction(setlist.id, newStatut)
    if (!res.error) setStatut(newStatut)
    setValidating(false)
  }

  async function handleManualSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    await flushPendingChanges()
  }

  const statutCfg = STATUT_CONFIG[statut] ?? STATUT_CONFIG.brouillon

  const libraryPanel = (
    <div className="flex flex-col min-h-0 h-full bg-muted/10">
      <div className="shrink-0 px-3 pt-3 pb-2 space-y-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={libSearch}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Rechercher un cantique…"
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-0.5 rounded-md border bg-muted/30 p-0.5">
          {([
            { id: 'gad',       label: '📘 GAD',      count: libGad.length },
            { id: 'chorale',   label: '🎤 Chorale',  count: libChorale.length },
            { id: 'frequents', label: '⭐',           count: libFrequents.length },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setLibTab(tab.id)}
              className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                libTab === tab.id
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className="ml-1 text-[10px] opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setLibMoment('')}
            className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
              libMoment === ''
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-foreground'
            }`}
          >
            Tous
          </button>
          {MOMENTS_CULTE.map(m => (
            <button
              key={m.value}
              onClick={() => setLibMoment(prev => prev === m.value ? '' : m.value)}
              className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                libMoment === m.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-foreground'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {libFiltered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Aucun cantique trouvé</p>
          </div>
        ) : (
          libFiltered.map(c => (
            <LibCantiqueRow
              key={c.id}
              cantique={c}
              alreadyAdded={addedIds.has(c.id)}
              adding={addingId === c.id}
              onAdd={handleAdd}
            />
          ))
        )}
      </div>
    </div>
  )

  const setlistPanel = (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-16">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted">
              <Music2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">Setlist vide</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez des cantiques depuis la bibliothèque.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 md:hidden"
              onClick={() => setMobileTab('library')}
            >
              <BookOpenText className="h-3.5 w-3.5" />
              Ouvrir la bibliothèque
            </Button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="setlist">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2"
                >
                  {items.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`rounded-lg transition-shadow ${
                            snapshot.isDragging ? 'shadow-lg ring-1 ring-primary/20' : ''
                          }`}
                        >
                          <SetlistItemRow
                            item={item}
                            index={index}
                            dragHandleProps={provided.dragHandleProps}
                            removing={removingId === item.id}
                            flash={flashItemId === item.id}
                            onRemove={handleRemove}
                            onFieldChange={handleFieldChange}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      <div className="shrink-0 border-t bg-background px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {stats.total} cantique{stats.total !== 1 ? 's' : ''}
          </span>
          {stats.gad > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <Music2 className="h-3.5 w-3.5 text-blue-500" />
              {stats.gad} GAD
            </span>
          )}
          {stats.chorale > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <Mic2 className="h-3.5 w-3.5 text-amber-500" />
              {stats.chorale} Chorale
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs ml-auto">
          {saveState === 'saving' && (
            <><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /><span className="text-muted-foreground">Sauvegarde…</span></>
          )}
          {saveState === 'saved' && (
            <><Check className="h-3.5 w-3.5 text-emerald-600" /><span className="text-emerald-600">Sauvegardé</span></>
          )}
          {saveState === 'unsaved' && (
            <><AlertCircle className="h-3.5 w-3.5 text-amber-500" /><span className="text-amber-600">Non sauvegardé</span></>
          )}
        </div>

        {saveError && <p className="text-xs text-destructive w-full">{saveError}</p>}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={handleManualSave}
            disabled={saveState === 'saving' || saveState === 'saved'}
          >
            <Save className="h-3.5 w-3.5" />
            Sauvegarder
          </Button>

          <Link href={`/projection/setlists/${setlist.id}/apercu`} target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
              <Eye className="h-3.5 w-3.5" />
              Aperçu
            </Button>
          </Link>

          <Button
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={handleValidate}
            disabled={validating || statut === 'utilise'}
            variant={statut === 'brouillon' ? 'default' : 'outline'}
          >
            {validating
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <CheckCircle2 className="h-3.5 w-3.5" />}
            {statut === 'brouillon' ? 'Valider' : 'Validée ✓'}
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 48px)' }}>

      {/* Header */}
      <div className="shrink-0 border-b bg-background px-4 py-2.5 flex items-center gap-3">
        <Link href="/projection/setlists">
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Retour</span>
          </Button>
        </Link>

        <div className="h-4 w-px bg-border" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            <span className="hidden sm:inline">Setlist · </span>{pageTitle}
          </p>
          {culte?.theme && (
            <p className="text-xs text-muted-foreground truncate hidden sm:block">{culte.theme}</p>
          )}
        </div>

        <Badge variant="outline" className={`shrink-0 text-xs ${statutCfg.badge}`}>
          {statutCfg.label}
        </Badge>

        <Button
          size="sm"
          className="shrink-0 gap-1.5 hidden sm:flex"
          onClick={handleValidate}
          disabled={validating || statut === 'utilise'}
          variant={statut === 'brouillon' ? 'default' : 'outline'}
        >
          {validating
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <CheckCircle2 className="h-3.5 w-3.5" />}
          {statut === 'brouillon' ? 'Valider la setlist' : 'Retour en brouillon'}
        </Button>
      </div>

      {/* Mobile tab bar */}
      <div className="md:hidden shrink-0 border-b bg-background flex">
        <button
          onClick={() => setMobileTab('library')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            mobileTab === 'library'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          📚 Bibliothèque
        </button>
        <button
          onClick={() => setMobileTab('setlist')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            mobileTab === 'setlist'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          🎵 Ma Setlist
          {stats.total > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {stats.total}
            </span>
          )}
        </button>
      </div>

      {/* Desktop: split / Mobile: single panel */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* Desktop split */}
        <div className="hidden md:flex h-full">
          <div className="w-[40%] min-w-0 border-r flex flex-col min-h-0">
            {libraryPanel}
          </div>
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {setlistPanel}
          </div>
        </div>

        {/* Mobile single panel */}
        <div className="md:hidden h-full relative">
          {mobileTab === 'library' ? (
            <>
              {libraryPanel}
              {/* Floating add hint */}
              {items.length === 0 && (
                <button
                  onClick={() => setMobileTab('setlist')}
                  className="absolute bottom-4 right-4 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                  <Star className="h-5 w-5" />
                </button>
              )}
            </>
          ) : (
            setlistPanel
          )}
        </div>
      </div>
    </div>
  )
}
