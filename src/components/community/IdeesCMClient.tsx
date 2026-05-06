'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, CheckCircle, ArrowRight, Trash2, AlertCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { IdeaContenu, MembreCM, Plateforme, PrioritéIdee, StatutIdee } from '@/types/community'
import { PLATEFORMES_CONFIG, PLATEFORMES_BY_CODE } from '@/types/community'
import type { Culte } from '@/types/annonces'
import {
  creerIdeeAction,
  approuverIdeeAction,
  marquerUtiliseeAction,
  supprimerIdeeAction,
  type IdeePayload,
} from '@/app/community/idees/actions'
import { PostModal } from '@/components/community/PostModal'

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITES: { code: PrioritéIdee; label: string; couleur: string; bg: string }[] = [
  { code: 'urgente', label: 'Urgente', couleur: '#EF4444', bg: '#FEE2E2' },
  { code: 'haute',   label: 'Haute',   couleur: '#F97316', bg: '#FFEDD5' },
  { code: 'normale', label: 'Normale', couleur: '#3B82F6', bg: '#DBEAFE' },
  { code: 'basse',   label: 'Basse',   couleur: '#94A3B8', bg: '#F1F5F9' },
]

const PRIORITE_BY_CODE = Object.fromEntries(
  PRIORITES.map(p => [p.code, p])
) as Record<PrioritéIdee, typeof PRIORITES[number]>

const PRIORITE_ORDER: Record<PrioritéIdee, number> = {
  urgente: 1, haute: 2, normale: 3, basse: 4,
}

const STATUT_CFG: Record<StatutIdee, { label: string; couleur: string; bg: string }> = {
  idee:      { label: 'Idée',      couleur: '#94A3B8', bg: '#F1F5F9' },
  approuvee: { label: 'Approuvée', couleur: '#10B981', bg: '#D1FAE5' },
  utilisee:  { label: 'Utilisée',  couleur: '#94A3B8', bg: '#F1F5F9' },
}

const TYPES_CONTENU = [
  { code: 'photo',     label: 'Photo' },
  { code: 'video',     label: 'Vidéo' },
  { code: 'reel',      label: 'Reel' },
  { code: 'story',     label: 'Story' },
  { code: 'texte',     label: 'Texte' },
  { code: 'annonce',   label: 'Annonce' },
  { code: 'citation',  label: 'Citation' },
  { code: 'evenement', label: 'Événement' },
  { code: 'carrousel', label: 'Carrousel' },
  { code: 'programme', label: 'Programme' },
  { code: 'short',     label: 'Short' },
  { code: 'duet',      label: 'Duet' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function lundiSemaineActuelle(): string {
  const d   = new Date()
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return d.toISOString().slice(0, 10)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + '…'
}

// ── IdeeModal (formulaire soumettre une idée) ─────────────────────────────────

const ideeSchema = z.object({
  titre:        z.string().min(1, 'Le titre est obligatoire').max(200),
  description:  z.string().optional(),
  plateforme:   z.array(z.string()).min(1, 'Choisir au moins une plateforme'),
  type_contenu: z.string().optional(),
  priorite:     z.enum(['urgente', 'haute', 'normale', 'basse']),
})

type IdeeFormData = z.infer<typeof ideeSchema>

function IdeeModal({
  open,
  onClose,
}: {
  open:    boolean
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<IdeeFormData>({
    resolver: zodResolver(ideeSchema),
    defaultValues: {
      titre:        '',
      description:  '',
      plateforme:   [],
      type_contenu: '',
      priorite:     'normale',
    },
  })

  const selectedPlateformes = watch('plateforme') as string[]

  function togglePlateforme(code: string) {
    const current = selectedPlateformes
    setValue(
      'plateforme',
      current.includes(code) ? current.filter(c => c !== code) : [...current, code],
      { shouldValidate: true },
    )
  }

  function handleClose() {
    reset()
    setServerError(null)
    onClose()
  }

  function onSubmit(data: IdeeFormData) {
    const payload: IdeePayload = {
      titre:        data.titre.trim(),
      description:  data.description?.trim() || null,
      plateforme:   data.plateforme,
      type_contenu: data.type_contenu || null,
      priorite:     data.priorite,
    }

    startTransition(async () => {
      const result = await creerIdeeAction(payload)
      if (!result.success) {
        setServerError(result.error)
        return
      }
      toast.success('Idée soumise ✓')
      handleClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Soumettre une idée</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Titre */}
          <div className="space-y-1.5">
            <Label>Titre *</Label>
            <Input {...register('titre')} placeholder="Idée de post…" autoFocus />
            {errors.titre && (
              <p className="text-xs text-destructive">{errors.titre.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              {...register('description')}
              rows={3}
              placeholder="Détails, angle, inspiration…"
            />
          </div>

          {/* Plateforme(s) */}
          <div className="space-y-2">
            <Label>Plateforme(s) visée(s) *</Label>
            <div className="grid grid-cols-3 gap-2">
              {PLATEFORMES_CONFIG.map(p => {
                const active = selectedPlateformes.includes(p.code)
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => togglePlateforme(p.code)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all',
                      active ? 'border-transparent' : 'bg-background hover:bg-muted',
                    )}
                    style={active ? { background: p.couleurBg, color: p.couleur, borderColor: p.couleur } : {}}
                  >
                    <span>{p.icone}</span>
                    <span className="truncate">{p.label}</span>
                  </button>
                )
              })}
            </div>
            {errors.plateforme && (
              <p className="text-xs text-destructive">{errors.plateforme.message}</p>
            )}
          </div>

          {/* Type + Priorité */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type de contenu</Label>
              <Controller
                name="type_contenu"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="— Type —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— Indéfini —</SelectItem>
                      {TYPES_CONTENU.map(t => (
                        <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priorité *</Label>
              <Controller
                name="priorite"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITES.map(p => (
                        <SelectItem key={p.code} value={p.code}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block h-2 w-2 rounded-full shrink-0"
                              style={{ background: p.couleur }}
                            />
                            {p.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {serverError && (
            <p className="text-sm text-destructive flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Envoi…' : 'Soumettre'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── DeleteConfirmDialog ───────────────────────────────────────────────────────

function DeleteConfirmDialog({
  idee,
  onClose,
}: {
  idee:    IdeaContenu | null
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!idee) return
    startTransition(async () => {
      const result = await supprimerIdeeAction(idee.id)
      if (!result.success) toast.error(result.error)
      onClose()
    })
  }

  return (
    <Dialog open={!!idee} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Supprimer cette idée ?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          « {idee?.titre} » sera définitivement supprimée.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Annuler</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? 'Suppression…' : 'Supprimer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── IdeaCard ──────────────────────────────────────────────────────────────────

function IdeaCard({
  idee,
  expanded,
  onToggleExpand,
  onApprouver,
  onCreerPost,
  onSupprimer,
}: {
  idee:           IdeaContenu
  expanded:       boolean
  onToggleExpand: () => void
  onApprouver:    () => void
  onCreerPost:    () => void
  onSupprimer:    () => void
}) {
  const [approvePending, startApprove] = useTransition()
  const prioriteCfg = PRIORITE_BY_CODE[idee.priorite]
  const statutCfg   = STATUT_CFG[idee.statut]
  const isUtilisee  = idee.statut === 'utilisee'

  const descText      = idee.description ?? ''
  const isLong        = descText.length > 120
  const displayedDesc = isLong && !expanded ? truncate(descText, 120) : descText

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 space-y-3 break-inside-avoid transition-opacity',
        isUtilisee && 'opacity-60',
      )}
    >
      {/* Top row: platforms + type */}
      <div className="flex flex-wrap gap-1.5">
        {(idee.plateforme as string[]).map(code => {
          const cfg = PLATEFORMES_BY_CODE[code as Plateforme]
          if (!cfg) return null
          return (
            <span
              key={code}
              className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ background: cfg.couleurBg, color: cfg.couleur }}
            >
              {cfg.icone} {cfg.label}
            </span>
          )
        })}
        {idee.type_contenu && (
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground capitalize">
            {idee.type_contenu}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className={cn('font-semibold text-sm leading-snug', isUtilisee && 'line-through text-muted-foreground')}>
        {idee.titre}
      </h3>

      {/* Description */}
      {descText && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground leading-relaxed">{displayedDesc}</p>
          {isLong && (
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-0.5 text-xs text-primary hover:underline"
            >
              {expanded ? 'Voir moins' : 'Voir plus'}
              <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
            </button>
          )}
        </div>
      )}

      {/* Priority + Status badges */}
      <div className="flex flex-wrap gap-1.5">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: prioriteCfg.bg, color: prioriteCfg.couleur }}
        >
          {prioriteCfg.label}
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-medium',
            isUtilisee && 'line-through',
          )}
          style={{ background: statutCfg.bg, color: statutCfg.couleur }}
        >
          {statutCfg.label}
        </span>
      </div>

      {/* Date */}
      <p className="text-[11px] text-muted-foreground">
        {formatDate(idee.created_at)}
      </p>

      {/* Actions */}
      {!isUtilisee && (
        <div className="flex flex-wrap gap-2 pt-1 border-t">
          {idee.statut !== 'approuvee' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs text-green-700 border-green-200 hover:bg-green-50 hover:border-green-300"
              disabled={approvePending}
              onClick={() => {
                startApprove(async () => {
                  const result = await approuverIdeeAction(idee.id)
                  if (!result.success) toast.error(result.error)
                  else toast.success('Idée approuvée ✓')
                  onApprouver()
                })
              }}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Approuver
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
            onClick={onCreerPost}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Créer un post
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onSupprimer}
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Filter bar ────────────────────────────────────────────────────────────────

type FilterStatut = 'toutes' | 'approuvee' | 'non_utilisee'

const FILTER_BTNS: { code: FilterStatut; label: string }[] = [
  { code: 'toutes',       label: 'Toutes' },
  { code: 'approuvee',    label: 'Approuvées' },
  { code: 'non_utilisee', label: 'Non utilisées' },
]

// ── IdeesCMClient (root) ──────────────────────────────────────────────────────

export function IdeesCMClient({
  idees,
  membres,
  cultes,
}: {
  idees:   IdeaContenu[]
  membres: MembreCM[]
  cultes:  Culte[]
}) {
  // Filters & sort
  const [filterStatut,      setFilterStatut]      = useState<FilterStatut>('toutes')
  const [sortByPriorite,    setSortByPriorite]     = useState(false)
  const [filterPlateformes, setFilterPlateformes]  = useState<Set<string>>(new Set())

  // Expanded descriptions
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Modals
  const [ideeModalOpen,   setIdeeModalOpen]   = useState(false)
  const [deleteIdee,      setDeleteIdee]       = useState<IdeaContenu | null>(null)
  const [postModalOpen,   setPostModalOpen]    = useState(false)
  const [ideeForPost,     setIdeeForPost]      = useState<IdeaContenu | null>(null)

  const semaine = lundiSemaineActuelle()

  function togglePlateforme(code: string) {
    setFilterPlateformes(prev => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleCreerPost(idee: IdeaContenu) {
    setIdeeForPost(idee)
    setPostModalOpen(true)
  }

  // Filter
  const filtered = idees.filter(idee => {
    if (filterStatut === 'approuvee'    && idee.statut !== 'approuvee') return false
    if (filterStatut === 'non_utilisee' && idee.statut === 'utilisee')  return false
    if (filterPlateformes.size > 0) {
      const plates = idee.plateforme as string[]
      if (!plates.some(p => filterPlateformes.has(p))) return false
    }
    return true
  })

  // Sort
  const sorted = sortByPriorite
    ? [...filtered].sort((a, b) => PRIORITE_ORDER[a.priorite] - PRIORITE_ORDER[b.priorite])
    : filtered

  // Counts for badges
  const totalNonUtilisees = idees.filter(i => i.statut !== 'utilisee').length

  return (
    <div className="space-y-4">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter buttons */}
        <div className="flex rounded-lg border overflow-hidden">
          {FILTER_BTNS.map(f => (
            <button
              key={f.code}
              onClick={() => setFilterStatut(f.code)}
              className={cn(
                'px-3 py-1.5 text-sm transition-colors border-r last:border-r-0',
                filterStatut === f.code
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'hover:bg-muted',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Priority sort toggle */}
        <button
          onClick={() => setSortByPriorite(v => !v)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors',
            sortByPriorite
              ? 'bg-amber-50 border-amber-300 text-amber-800 font-medium'
              : 'hover:bg-muted',
          )}
        >
          <span>🔥</span> Par priorité
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {totalNonUtilisees} idée{totalNonUtilisees !== 1 ? 's' : ''} actives
          </span>
          <Button size="sm" className="gap-1" onClick={() => setIdeeModalOpen(true)}>
            <Plus className="h-4 w-4" /> Soumettre une idée
          </Button>
        </div>
      </div>

      {/* ── Platform filter pills ── */}
      <div className="flex flex-wrap gap-2">
        {PLATEFORMES_CONFIG.map(p => {
          const active = filterPlateformes.has(p.code)
          return (
            <button
              key={p.code}
              onClick={() => togglePlateforme(p.code)}
              className={cn(
                'flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                active ? 'border-transparent' : 'bg-background hover:bg-muted',
              )}
              style={active ? { background: p.couleurBg, color: p.couleur, borderColor: p.couleur } : {}}
            >
              {p.icone} {p.label}
              {active && <span className="ml-0.5 opacity-60">×</span>}
            </button>
          )
        })}
        {filterPlateformes.size > 0 && (
          <button
            onClick={() => setFilterPlateformes(new Set())}
            className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            Effacer
          </button>
        )}
      </div>

      {/* ── Grid ── */}
      {sorted.length === 0 ? (
        <div className="flex items-center justify-center h-48 rounded-xl border border-dashed text-muted-foreground text-sm">
          {idees.length === 0
            ? 'Aucune idée pour le moment — soumettez la première !'
            : 'Aucune idée ne correspond aux filtres sélectionnés.'}
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {sorted.map(idee => (
            <IdeaCard
              key={idee.id}
              idee={idee}
              expanded={expandedIds.has(idee.id)}
              onToggleExpand={() => toggleExpand(idee.id)}
              onApprouver={() => {/* revalidation handled by action */}}
              onCreerPost={() => handleCreerPost(idee)}
              onSupprimer={() => setDeleteIdee(idee)}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      <IdeeModal
        open={ideeModalOpen}
        onClose={() => setIdeeModalOpen(false)}
      />

      <DeleteConfirmDialog
        idee={deleteIdee}
        onClose={() => setDeleteIdee(null)}
      />

      <PostModal
        open={postModalOpen}
        onClose={() => {
          setPostModalOpen(false)
          setIdeeForPost(null)
        }}
        semaine={semaine}
        post={null}
        membres={membres}
        cultes={cultes}
        initialValues={ideeForPost ? {
          plateforme:   (ideeForPost.plateforme as string[])[0],
          type_contenu: ideeForPost.type_contenu ?? undefined,
          titre:        ideeForPost.titre,
          description:  ideeForPost.description ?? undefined,
        } : undefined}
        onSuccess={async () => {
          if (ideeForPost) {
            await marquerUtiliseeAction(ideeForPost.id)
          }
        }}
      />
    </div>
  )
}
