'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sheet, SheetTrigger, SheetContent, SheetHeader,
  SheetTitle, SheetDescription, SheetBody,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Lightbulb } from 'lucide-react'
import { PLATEFORMES_CONFIG, PLATEFORMES_BY_CODE } from '@/types/community'
import { createIdeaAction, updateIdeaStatutAction } from './actions'
import type { IdeaContenu, Plateforme, PrioritéIdee } from '@/types/community'

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITES: { value: PrioritéIdee; label: string; className: string }[] = [
  { value: 'urgente', label: '🔴 Urgente', className: 'border-red-200 bg-red-50 text-red-700' },
  { value: 'haute',   label: '🟠 Haute',   className: 'border-orange-200 bg-orange-50 text-orange-700' },
  { value: 'normale', label: '🟡 Normale', className: 'border-yellow-200 bg-yellow-50 text-yellow-700' },
  { value: 'basse',   label: '⚪ Basse',   className: 'border-slate-200 bg-slate-50 text-slate-500' },
]

const STATUTS_IDEE = [
  { value: 'idee',     label: 'Idée' },
  { value: 'approuvee', label: 'Approuvée' },
  { value: 'utilisee', label: 'Utilisée' },
]

function PrioriteBadge({ priorite }: { priorite: string }) {
  const cfg = PRIORITES.find(p => p.value === priorite) ?? PRIORITES[2]
  return (
    <Badge variant="outline" className={`text-[10px] h-5 px-2 ${cfg.className}`}>
      {cfg.label}
    </Badge>
  )
}

// ── IdeaForm ──────────────────────────────────────────────────────────────────

function IdeaForm({ onDone }: { onDone: () => void }) {
  const [titre,       setTitre]       = useState('')
  const [description, setDescription] = useState('')
  const [priorite,    setPriorite]    = useState<PrioritéIdee>('normale')
  const [plateformes, setPlateformes] = useState<string[]>([])
  const [loading,     setLoading]     = useState(false)
  const [err,         setErr]         = useState<string | null>(null)

  function togglePlateforme(code: string) {
    setPlateformes(prev =>
      prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titre.trim()) { setErr('Le titre est obligatoire.'); return }
    setLoading(true)
    setErr(null)
    try {
      const result = await createIdeaAction({
        titre:        titre.trim(),
        description:  description.trim() || null,
        priorite,
        plateforme:   plateformes,
        type_contenu: null,
      })
      if (result.error) { setErr(result.error); return }
      toast.success('Idée ajoutée')
      onDone()
    } catch (e) {
      setErr(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="titre">Titre *</Label>
        <Input
          id="titre"
          value={titre}
          onChange={e => setTitre(e.target.value)}
          placeholder="Titre de l'idée…"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Détails, inspiration, références…"
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Priorité</Label>
        <div className="flex flex-wrap gap-2">
          {PRIORITES.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriorite(p.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-opacity ${p.className} ${priorite === p.value ? 'ring-2 ring-offset-1 ring-current' : 'opacity-60'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Plateformes</Label>
        <div className="flex flex-wrap gap-2">
          {PLATEFORMES_CONFIG.map(p => {
            const selected = plateformes.includes(p.code)
            return (
              <button
                key={p.code}
                type="button"
                onClick={() => togglePlateforme(p.code)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${selected ? 'opacity-100 ring-2 ring-current' : 'opacity-50'}`}
                style={selected ? { color: p.couleur, borderColor: p.couleur, background: p.couleurBg } : {}}
              >
                {p.icone} {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {err && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{err}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? 'Enregistrement…' : 'Ajouter l\'idée'}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>Annuler</Button>
      </div>
    </form>
  )
}

// ── IdeesClient ───────────────────────────────────────────────────────────────

export default function IdeesClient({ idees }: { idees: IdeaContenu[] }) {
  const router              = useRouter()
  const [, startTransition] = useTransition()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filterStatut, setFilterStatut] = useState<string>('all')

  function refresh() { startTransition(() => router.refresh()) }

  function handleDone() { setSheetOpen(false); refresh() }

  async function handleStatutChange(id: string, statut: string) {
    const result = await updateIdeaStatutAction(id, statut)
    if (result?.error) { toast.error(result.error); return }
    refresh()
  }

  const filtered = filterStatut === 'all'
    ? idees
    : idees.filter(i => i.statut === filterStatut)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          {[{ value: 'all', label: 'Toutes' }, ...STATUTS_IDEE].map(s => (
            <Button
              key={s.value}
              size="sm"
              variant={filterStatut === s.value ? 'default' : 'outline'}
              className="h-7 px-3 text-xs"
              onClick={() => setFilterStatut(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="h-7 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Nouvelle idée
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Nouvelle idée de contenu</SheetTitle>
              <SheetDescription>Ajoutez une idée à explorer pour vos posts.</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <IdeaForm onDone={handleDone} />
            </SheetBody>
          </SheetContent>
        </Sheet>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Lightbulb className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aucune idée pour l&apos;instant.</p>
          <Button size="sm" variant="outline" onClick={() => setSheetOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Ajouter une idée
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(idee => (
            <Card key={idee.id} className="flex flex-col overflow-hidden">
              <CardContent className="flex-1 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <PrioriteBadge priorite={idee.priorite} />
                  <Select value={idee.statut} onValueChange={v => handleStatutChange(idee.id, v)}>
                    <SelectTrigger className="h-6 w-28 text-[10px] border-0 bg-muted/50 px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUTS_IDEE.map(s => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="font-semibold text-sm leading-snug line-clamp-2">{idee.titre}</p>

                {idee.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{idee.description}</p>
                )}

                {(idee.plateforme ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(idee.plateforme as string[]).map(p => {
                      const cfg = PLATEFORMES_BY_CODE[p as Plateforme]
                      return (
                        <Badge
                          key={p}
                          variant="outline"
                          className="text-[10px] h-4 px-1.5"
                          style={cfg ? { borderColor: cfg.couleur + '60', color: cfg.couleur } : {}}
                        >
                          {cfg ? `${cfg.icone} ${cfg.label}` : p}
                        </Badge>
                      )
                    })}
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground/60 pt-1">
                  {new Date(idee.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
