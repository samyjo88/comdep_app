'use client'

import { useState, useTransition, useOptimistic, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import { ChevronLeft, ChevronRight, Plus, LayoutList, Columns, Trash2, Pencil, Eye, AlertCircle, GripVertical, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Post, MembreCM, PlanningCM, Plateforme, StatutPost, TypeContenu } from '@/types/community'
import { PLATEFORMES_CONFIG, PLATEFORMES_BY_CODE, STATUTS_POST, STATUTS_POST_BY_CODE } from '@/types/community'
import {
  creerPostAction,
  modifierPostAction,
  supprimerPostAction,
  updateStatutPostAction,
  type PostPayload,
} from '@/app/community/posts/actions'

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPES_CONTENU: { code: TypeContenu; label: string }[] = [
  { code: 'photo',      label: 'Photo' },
  { code: 'video',      label: 'Vidéo' },
  { code: 'reel',       label: 'Reel' },
  { code: 'story',      label: 'Story' },
  { code: 'texte',      label: 'Texte' },
  { code: 'annonce',    label: 'Annonce' },
  { code: 'citation',   label: 'Citation' },
  { code: 'evenement',  label: 'Événement' },
]

// Kanban columns: en_attente_validation lives in en_creation column
const KANBAN_COLS: { id: string; label: string; statuts: StatutPost[] }[] = [
  { id: 'a_faire',    label: 'À faire',      statuts: ['a_faire'] },
  { id: 'en_cours',  label: 'En cours',      statuts: ['en_creation', 'en_attente_validation'] },
  { id: 'programme', label: 'Programmé',     statuts: ['programme'] },
  { id: 'publie',    label: 'Publié',        statuts: ['publie'] },
  { id: 'annule',    label: 'Annulé',        statuts: ['annule'] },
]

// Map statut → kanban column id
const STATUT_TO_COL: Record<StatutPost, string> = {
  a_faire:               'a_faire',
  en_creation:           'en_cours',
  en_attente_validation: 'en_cours',
  programme:             'programme',
  publie:                'publie',
  annule:                'annule',
}

// When dropping into a column, use this statut
const COL_TO_STATUT: Record<string, StatutPost> = {
  a_faire:    'a_faire',
  en_cours:   'en_creation',
  programme:  'programme',
  publie:     'publie',
  annule:     'annule',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function semaineSuivante(semaine: string): string {
  const d = new Date(semaine + 'T12:00:00')
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

function semainePrecedente(semaine: string): string {
  const d = new Date(semaine + 'T12:00:00')
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

function formatSemaine(semaine: string): string {
  const debut = new Date(semaine + 'T12:00:00')
  const fin   = new Date(semaine + 'T12:00:00')
  fin.setDate(fin.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${debut.toLocaleDateString('fr-FR', opts)} – ${fin.toLocaleDateString('fr-FR', opts)}`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function isLate(post: Post): boolean {
  if (!post.date_publication_prevue) return false
  if (post.statut === 'publie' || post.statut === 'annule') return false
  return new Date(post.date_publication_prevue) < new Date()
}

function membreInitiales(m: MembreCM): string {
  return `${m.prenom[0] ?? ''}${m.nom[0] ?? ''}`.toUpperCase()
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const postSchema = z.object({
  plateforme:              z.enum(['facebook', 'instagram', 'whatsapp', 'youtube', 'twitter', 'tiktok']),
  type_contenu:            z.enum(['photo', 'video', 'reel', 'story', 'texte', 'annonce', 'citation', 'evenement']),
  titre:                   z.string().max(200).nullable(),
  description:             z.string().nullable(),
  lien_media:              z.string().url('URL invalide').nullable().or(z.literal('')).transform(v => v === '' ? null : v),
  date_publication_prevue: z.string().nullable(),
  assignee_id:             z.string().nullable(),
  statut:                  z.enum(['a_faire', 'en_creation', 'en_attente_validation', 'programme', 'publie', 'annule']),
  notes:                   z.string().nullable(),
})

type PostFormData = z.infer<typeof postSchema>

// ── PostModal ─────────────────────────────────────────────────────────────────

function PostModal({
  open,
  onClose,
  semaine,
  post,
  membres,
}: {
  open:     boolean
  onClose:  () => void
  semaine:  string
  post:     Post | null
  membres:  MembreCM[]
}) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEdit = !!post

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: post ? {
      plateforme:              post.plateforme,
      type_contenu:            post.type_contenu,
      titre:                   post.titre ?? '',
      description:             post.description ?? '',
      lien_media:              post.lien_media ?? '',
      date_publication_prevue: post.date_publication_prevue
        ? post.date_publication_prevue.slice(0, 16)
        : '',
      assignee_id: post.assignee_id ?? '',
      statut:      post.statut,
      notes:       post.notes ?? '',
    } : {
      plateforme:              'facebook',
      type_contenu:            'photo',
      titre:                   '',
      description:             '',
      lien_media:              '',
      date_publication_prevue: '',
      assignee_id:             '',
      statut:                  'a_faire',
      notes:                   '',
    },
  })

  function handleClose() {
    reset()
    setServerError(null)
    onClose()
  }

  function onSubmit(data: PostFormData) {
    const payload: PostPayload = {
      plateforme:              data.plateforme,
      type_contenu:            data.type_contenu,
      titre:                   data.titre || null,
      description:             data.description || null,
      lien_media:              data.lien_media || null,
      date_publication_prevue: data.date_publication_prevue
        ? new Date(data.date_publication_prevue).toISOString()
        : null,
      assignee_id: data.assignee_id || null,
      statut:      data.statut,
      notes:       data.notes || null,
    }

    startTransition(async () => {
      const result = isEdit
        ? await modifierPostAction(post!.id, payload)
        : await creerPostAction(semaine, payload)

      if (!result.success) {
        setServerError(result.error)
        return
      }
      handleClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le post' : 'Nouveau post'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Plateforme + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Plateforme *</label>
              <Controller
                name="plateforme"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATEFORMES_CONFIG.map(p => (
                        <SelectItem key={p.code} value={p.code}>
                          {p.icone} {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Type *</label>
              <Controller
                name="type_contenu"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES_CONTENU.map(t => (
                        <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Titre */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Titre</label>
            <Input {...register('titre')} placeholder="Titre du post…" />
            {errors.titre && <p className="text-xs text-destructive">{errors.titre.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Description / Texte</label>
            <Textarea {...register('description')} rows={3} placeholder="Contenu du post…" />
          </div>

          {/* Date + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Date de publication</label>
              <Input type="datetime-local" {...register('date_publication_prevue')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Assigné à</label>
              <Controller
                name="assignee_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="— Personne —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— Personne —</SelectItem>
                      {membres.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.prenom} {m.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Statut */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Statut *</label>
            <Controller
              name="statut"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTS_POST.map(s => (
                      <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Lien média */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Lien média</label>
            <Input {...register('lien_media')} placeholder="https://…" />
            {errors.lien_media && <p className="text-xs text-destructive">{errors.lien_media.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Notes</label>
            <Textarea {...register('notes')} rows={2} placeholder="Notes internes…" />
          </div>

          {serverError && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-4 w-4 shrink-0" /> {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── DeleteConfirmDialog ───────────────────────────────────────────────────────

function DeleteConfirmDialog({
  post,
  onClose,
}: {
  post:    Post | null
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!post) return
    startTransition(async () => {
      await supprimerPostAction(post.id)
      onClose()
    })
  }

  return (
    <Dialog open={!!post} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Supprimer ce post ?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {post?.titre
            ? <>« {post.titre} » sera définitivement supprimé.</>
            : 'Ce post sera définitivement supprimé.'}
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

// ── StatutInline ──────────────────────────────────────────────────────────────

function StatutInline({ post }: { post: Post }) {
  const [isPending, startTransition] = useTransition()
  const cfg = STATUTS_POST_BY_CODE[post.statut]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: cfg.couleur + '22', color: cfg.couleur }}
          disabled={isPending}
        >
          {cfg.label}
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {STATUTS_POST.map(s => (
          <DropdownMenuItem
            key={s.code}
            className={cn('text-xs', s.code === post.statut && 'font-semibold')}
            onClick={() => {
              if (s.code === post.statut) return
              startTransition(async () => { await updateStatutPostAction(post.id, s.code) })
            }}
          >
            <span
              className="mr-2 inline-block h-2 w-2 rounded-full"
              style={{ background: s.couleur }}
            />
            {s.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── AssigneeBadge ─────────────────────────────────────────────────────────────

function AssigneeBadge({ assigneeId, membres }: { assigneeId: string | null; membres: MembreCM[] }) {
  if (!assigneeId) return <span className="text-muted-foreground text-xs">—</span>
  const m = membres.find(x => x.id === assigneeId)
  if (!m) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
        {membreInitiales(m)}
      </span>
      {m.prenom}
    </span>
  )
}

// ── Vue Tableau ───────────────────────────────────────────────────────────────

type SortKey = 'date_publication_prevue' | 'plateforme' | 'statut'

function VueTableau({
  posts,
  membres,
  filteredStatuts,
  filteredPlateformes,
  onEdit,
  onDelete,
}: {
  posts:               Post[]
  membres:             MembreCM[]
  filteredStatuts:     Set<StatutPost>
  filteredPlateformes: Set<Plateforme>
  onEdit:              (p: Post) => void
  onDelete:            (p: Post) => void
}) {
  const [sortKey, setSortKey]   = useState<SortKey>('date_publication_prevue')
  const [sortAsc, setSortAsc]   = useState(true)

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  const visible = posts
    .filter(p =>
      (filteredStatuts.size === 0     || filteredStatuts.has(p.statut)) &&
      (filteredPlateformes.size === 0 || filteredPlateformes.has(p.plateforme))
    )
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date_publication_prevue') {
        cmp = (a.date_publication_prevue ?? '').localeCompare(b.date_publication_prevue ?? '')
      } else if (sortKey === 'plateforme') {
        cmp = a.plateforme.localeCompare(b.plateforme)
      } else {
        cmp = STATUTS_POST_BY_CODE[a.statut].ordre - STATUTS_POST_BY_CODE[b.statut].ordre
      }
      return sortAsc ? cmp : -cmp
    })

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    return (
      <button
        className="flex items-center gap-1 font-semibold hover:text-foreground"
        onClick={() => toggleSort(k)}
      >
        {label}
        {sortKey === k && <span className="text-xs">{sortAsc ? '▲' : '▼'}</span>}
      </button>
    )
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border border-dashed flex items-center justify-center h-40 text-muted-foreground text-sm">
        Aucun post pour cette semaine
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead><SortHeader label="Plateforme" k="plateforme" /></TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Titre / Description</TableHead>
            <TableHead><SortHeader label="Date prévue" k="date_publication_prevue" /></TableHead>
            <TableHead>Assigné</TableHead>
            <TableHead><SortHeader label="Statut" k="statut" /></TableHead>
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map(post => {
            const late = isLate(post)
            const platCfg = PLATEFORMES_BY_CODE[post.plateforme]
            return (
              <TableRow key={post.id} className={cn(late && 'bg-red-50 dark:bg-red-950/20')}>
                <TableCell>
                  {late && <AlertCircle className="h-4 w-4 text-destructive" />}
                </TableCell>
                <TableCell>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ background: platCfg.couleurBg, color: platCfg.couleur }}
                  >
                    {platCfg.icone} {platCfg.label}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground capitalize">
                  {post.type_contenu}
                </TableCell>
                <TableCell className="max-w-[200px]">
                  {post.titre
                    ? <span className="font-medium text-sm line-clamp-1">{post.titre}</span>
                    : <span className="text-muted-foreground text-xs line-clamp-2">{post.description ?? '—'}</span>
                  }
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {formatDate(post.date_publication_prevue)}
                </TableCell>
                <TableCell>
                  <AssigneeBadge assigneeId={post.assignee_id} membres={membres} />
                </TableCell>
                <TableCell>
                  <StatutInline post={post} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => onEdit(post)}
                      title="Modifier"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onDelete(post)}
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// ── KanbanCard ────────────────────────────────────────────────────────────────

function KanbanCard({
  post,
  membres,
  index,
  onEdit,
  onDelete,
}: {
  post:    Post
  membres: MembreCM[]
  index:   number
  onEdit:  (p: Post) => void
  onDelete:(p: Post) => void
}) {
  const platCfg = PLATEFORMES_BY_CODE[post.plateforme]
  const late    = isLate(post)
  const statCfg = STATUTS_POST_BY_CODE[post.statut]

  return (
    <Draggable draggableId={post.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'rounded-lg border bg-card p-3 shadow-sm space-y-2 group',
            snapshot.isDragging && 'shadow-lg rotate-1 opacity-95',
            late && 'border-destructive/50',
          )}
        >
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span {...provided.dragHandleProps} className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <GripVertical className="h-3.5 w-3.5" />
              </span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0"
                style={{ background: platCfg.couleurBg, color: platCfg.couleur }}
              >
                {platCfg.icone} {platCfg.label}
              </span>
              {post.statut === 'en_attente_validation' && (
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 shrink-0">
                  À valider
                </span>
              )}
            </div>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                className="rounded p-0.5 hover:bg-muted"
                onClick={() => onEdit(post)}
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
              <button
                className="rounded p-0.5 hover:bg-muted"
                onClick={() => onDelete(post)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          </div>

          {post.titre && (
            <p className="text-sm font-medium line-clamp-2 leading-tight">{post.titre}</p>
          )}
          {!post.titre && post.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{post.description}</p>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="capitalize">{post.type_contenu}</span>
            <div className="flex items-center gap-1.5">
              {late && <AlertCircle className="h-3 w-3 text-destructive" />}
              <span className={cn(late && 'text-destructive font-medium')}>
                {formatDate(post.date_publication_prevue)}
              </span>
            </div>
          </div>

          {post.assignee_id && (
            <AssigneeBadge assigneeId={post.assignee_id} membres={membres} />
          )}

          {post.statut === 'publie' && (post.nb_likes !== null || post.nb_vues !== null) && (
            <div className="flex gap-2 text-[10px] text-muted-foreground border-t pt-1.5">
              {post.nb_vues   !== null && <span>👁 {post.nb_vues}</span>}
              {post.nb_likes  !== null && <span>❤️ {post.nb_likes}</span>}
              {post.nb_partages !== null && <span>🔁 {post.nb_partages}</span>}
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}

// ── Vue Kanban ────────────────────────────────────────────────────────────────

function VueKanban({
  posts,
  membres,
  filteredPlateformes,
  onEdit,
  onDelete,
}: {
  posts:               Post[]
  membres:             MembreCM[]
  filteredPlateformes: Set<Plateforme>
  onEdit:              (p: Post) => void
  onDelete:            (p: Post) => void
}) {
  const [, startTransition] = useTransition()
  const [annuleOpen, setAnnuleOpen] = useState(false)

  const filtered = posts.filter(p =>
    filteredPlateformes.size === 0 || filteredPlateformes.has(p.plateforme)
  )

  // Build column → posts map with optimistic state
  type PostMap = Record<string, Post[]>
  const buildMap = useCallback((list: Post[]): PostMap => {
    const map: PostMap = {}
    for (const col of KANBAN_COLS) map[col.id] = []
    for (const p of list) {
      const col = STATUT_TO_COL[p.statut]
      map[col]?.push(p)
    }
    return map
  }, [])

  const [optimisticMap, updateOptimistic] = useOptimistic(
    buildMap(filtered),
    (state: PostMap, { postId, fromCol, toCol, toIndex }: { postId: string; fromCol: string; toCol: string; toIndex: number }) => {
      const next = { ...state }
      for (const k of Object.keys(next)) next[k] = [...next[k]]
      const src = next[fromCol].findIndex(p => p.id === postId)
      if (src === -1) return state
      const [moved] = next[fromCol].splice(src, 1)
      const newStatut = COL_TO_STATUT[toCol] ?? moved.statut
      next[toCol].splice(toIndex, 0, { ...moved, statut: newStatut })
      return next
    }
  )

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const fromCol  = source.droppableId
    const toCol    = destination.droppableId
    const newStatut = COL_TO_STATUT[toCol]
    if (!newStatut) return

    startTransition(async () => {
      updateOptimistic({ postId: draggableId, fromCol, toCol, toIndex: destination.index })
      await updateStatutPostAction(draggableId, newStatut)
    })
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {KANBAN_COLS.map(col => {
          const colPosts  = optimisticMap[col.id] ?? []
          const isAnnule  = col.id === 'annule'
          const isCollapsed = isAnnule && !annuleOpen

          return (
            <div
              key={col.id}
              className={cn(
                'flex flex-col rounded-xl border bg-muted/30 shrink-0',
                isCollapsed ? 'w-12' : 'w-64',
              )}
            >
              {/* Column header */}
              <div
                className={cn(
                  'flex items-center justify-between px-3 py-2 border-b',
                  isAnnule && 'cursor-pointer hover:bg-muted/50',
                  isCollapsed && 'flex-col gap-1 h-full justify-start py-4',
                )}
                onClick={() => isAnnule && setAnnuleOpen(o => !o)}
              >
                {isCollapsed ? (
                  <>
                    <span className="text-xs font-semibold text-muted-foreground [writing-mode:vertical-lr] rotate-180">
                      {col.label}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1">{colPosts.length}</Badge>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold">{col.label}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">{colPosts.length}</Badge>
                      {isAnnule && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                  </>
                )}
              </div>

              {!isCollapsed && (
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'flex-1 p-2 space-y-2 min-h-[120px] transition-colors',
                        snapshot.isDraggingOver && 'bg-primary/5',
                      )}
                    >
                      {colPosts.map((post, idx) => (
                        <KanbanCard
                          key={post.id}
                          post={post}
                          membres={membres}
                          index={idx}
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      ))}
                      {provided.placeholder}
                      {colPosts.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border border-dashed rounded-lg">
                          Vide
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}

// ── PostsClient (root) ────────────────────────────────────────────────────────

export function PostsClient({
  semaine,
  vue,
  planning,
  posts,
  membres,
}: {
  semaine:  string
  vue:      'tableau' | 'kanban'
  planning: PlanningCM | null
  posts:    Post[]
  membres:  MembreCM[]
}) {
  const router = useRouter()

  // Modal state
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editPost,    setEditPost]     = useState<Post | null>(null)
  const [deletePost,  setDeletePost]   = useState<Post | null>(null)

  // Filters
  const [filterPlateformes, setFilterPlateformes] = useState<Set<Plateforme>>(new Set())
  const [filterStatuts,     setFilterStatuts]     = useState<Set<StatutPost>>(new Set())

  function togglePlateforme(code: Plateforme) {
    setFilterPlateformes(prev => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  function toggleStatut(code: StatutPost) {
    setFilterStatuts(prev => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  function navigate(targetSemaine: string, targetVue: 'tableau' | 'kanban') {
    router.push(`/community/posts?semaine=${targetSemaine}&vue=${targetVue}`)
  }

  function openCreate() {
    setEditPost(null)
    setModalOpen(true)
  }

  function openEdit(p: Post) {
    setEditPost(p)
    setModalOpen(true)
  }

  // Count for badge totals
  const visibleCount = posts.filter(p =>
    (filterStatuts.size === 0     || filterStatuts.has(p.statut)) &&
    (filterPlateformes.size === 0 || filterPlateformes.has(p.plateforme))
  ).length

  return (
    <div className="space-y-4">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Week nav */}
        <div className="flex items-center gap-1 rounded-lg border bg-background px-2 py-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => navigate(semainePrecedente(semaine), vue)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2 min-w-[160px] text-center">
            {formatSemaine(semaine)}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => navigate(semaineSuivante(semaine), vue)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Statut filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              Statuts
              {filterStatuts.size > 0 && (
                <Badge variant="secondary" className="ml-1 px-1 text-xs">{filterStatuts.size}</Badge>
              )}
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {STATUTS_POST.map(s => (
              <DropdownMenuCheckboxItem
                key={s.code}
                checked={filterStatuts.has(s.code)}
                onCheckedChange={() => toggleStatut(s.code)}
              >
                <span
                  className="mr-2 inline-block h-2 w-2 rounded-full"
                  style={{ background: s.couleur }}
                />
                {s.label}
              </DropdownMenuCheckboxItem>
            ))}
            {filterStatuts.size > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterStatuts(new Set())}>
                  Tout afficher
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Vue toggle */}
        <div className="flex rounded-lg border overflow-hidden">
          <button
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors',
              vue === 'tableau' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
            onClick={() => navigate(semaine, 'tableau')}
          >
            <LayoutList className="h-3.5 w-3.5" /> Tableau
          </button>
          <button
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l',
              vue === 'kanban' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
            onClick={() => navigate(semaine, 'kanban')}
          >
            <Columns className="h-3.5 w-3.5" /> Kanban
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{visibleCount} post{visibleCount !== 1 ? 's' : ''}</span>
          <Button size="sm" onClick={openCreate} className="gap-1">
            <Plus className="h-4 w-4" /> Nouveau post
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
                active
                  ? 'border-transparent'
                  : 'bg-background hover:bg-muted',
              )}
              style={active ? { background: p.couleurBg, color: p.couleur, borderColor: p.couleur } : {}}
            >
              {p.icone} {p.label}
              {active && (
                <span className="ml-0.5 opacity-60">×</span>
              )}
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

      {/* ── Planning info banner ── */}
      {planning && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          Semaine {planning.statut === 'confirme' ? 'confirmée' : planning.statut === 'termine' ? 'terminée' : 'planifiée'}
          {planning.notes && <span className="ml-2 text-foreground/70">— {planning.notes}</span>}
        </div>
      )}

      {/* ── Vue ── */}
      {vue === 'tableau' ? (
        <VueTableau
          posts={posts}
          membres={membres}
          filteredStatuts={filterStatuts}
          filteredPlateformes={filterPlateformes}
          onEdit={openEdit}
          onDelete={setDeletePost}
        />
      ) : (
        <VueKanban
          posts={posts}
          membres={membres}
          filteredPlateformes={filterPlateformes}
          onEdit={openEdit}
          onDelete={setDeletePost}
        />
      )}

      {/* ── Modals ── */}
      <PostModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        semaine={semaine}
        post={editPost}
        membres={membres}
      />
      <DeleteConfirmDialog
        post={deletePost}
        onClose={() => setDeletePost(null)}
      />
    </div>
  )
}
