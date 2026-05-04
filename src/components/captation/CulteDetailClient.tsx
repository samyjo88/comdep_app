'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import {
  ArrowLeft, Camera, ImageIcon, Palette, Plus, Trash2,
  ChevronDown, Loader2, AlertCircle, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button }              from '@/components/ui/button'
import { Badge }               from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label }               from '@/components/ui/label'
import { Input }               from '@/components/ui/input'
import { Textarea }            from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useIsMobile } from '@/hooks/use-media-query'
import { DossierDriveCard } from '@/components/captation/DossierDriveCard'
import { ROLES_CONFIG, ROLES_BY_CODE } from '@/types/captation'
import type {
  MembreCaptation, PlanningAvecMembre, LivraisonCaptation, DossierDrive,
  RoleCaptation, StatutPlanning, StatutLivraison, TypeLivrable,
} from '@/types/captation'
import type { CulteDetail } from '@/app/captation/culte/[id]/page'
import {
  upsertAssignmentAction, deleteAssignmentAction, updateStatutAssignmentAction,
  creerLivraisonAction, updateStatutLivraisonAction, supprimerLivraisonAction,
  sauvegarderNotesAction,
} from '@/app/captation/culte/[id]/actions'

// ══════════════════════════════════════════════════════════════════════════════
// Config
// ══════════════════════════════════════════════════════════════════════════════

const ROLE_ICON: Record<RoleCaptation, typeof Camera> = {
  cameraman:    Camera,
  photographe:  ImageIcon,
  infographiste: Palette,
}

const STATUT_ASSIGN_CONFIG: Record<StatutPlanning, { label: string; className: string }> = {
  planifie:  { label: 'Planifié',  className: 'bg-yellow-50  text-yellow-700  border-yellow-200  dark:bg-yellow-950  dark:text-yellow-400' },
  confirme:  { label: 'Confirmé',  className: 'bg-blue-50    text-blue-700    border-blue-200    dark:bg-blue-950    dark:text-blue-400'   },
  present:   { label: 'Présent',   className: 'bg-green-50   text-green-700   border-green-200   dark:bg-green-950   dark:text-green-400'  },
  absent:    { label: 'Absent',    className: 'bg-red-50     text-red-700     border-red-200     dark:bg-red-950     dark:text-red-400'    },
}

const STATUT_LIVRAISON_CONFIG: Record<StatutLivraison, { label: string; className: string }> = {
  a_faire:   { label: 'À faire',   className: 'bg-red-50     text-red-700     border-red-200'   },
  en_cours:  { label: 'En cours',  className: 'bg-orange-50  text-orange-700  border-orange-200' },
  livre:     { label: 'Livré',     className: 'bg-blue-50    text-blue-700    border-blue-200'  },
  valide:    { label: 'Validé',    className: 'bg-green-50   text-green-700   border-green-200' },
}

const TYPE_LIVRABLE_LABELS: Record<TypeLivrable, string> = {
  video_brute:           'Vidéo brute',
  video_montee:          'Vidéo montée',
  photos_selectionnees:  'Photos sélectionnées',
  visuel_reseaux:        'Visuel réseaux',
  autre:                 'Autre',
}

// ══════════════════════════════════════════════════════════════════════════════
// Statut global
// ══════════════════════════════════════════════════════════════════════════════

type StatutGlobal = 'preparation' | 'confirme' | 'livrables' | 'couvert' | 'archive'

function calculerStatutGlobal(
  culte:       CulteDetail,
  assignments: PlanningAvecMembre[],
  livraisons:  LivraisonCaptation[],
): StatutGlobal {
  const passe = culte.date_culte < new Date().toISOString().slice(0, 10)
  if (assignments.length < 3) return 'preparation'
  const tousPresents  = assignments.every(a => a.statut === 'present')
  const tousConfirmes = assignments.every(a => a.statut === 'confirme' || a.statut === 'present')
  if (passe && tousPresents) {
    const tousValides = livraisons.length > 0 && livraisons.every(l => l.statut === 'valide')
    return tousValides ? 'archive' : 'livrables'
  }
  if (tousConfirmes) return 'confirme'
  return 'preparation'
}

const STATUT_GLOBAL_CONFIG: Record<StatutGlobal, { label: string; className: string }> = {
  preparation: { label: 'En préparation', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  confirme:    { label: 'Confirmé',       className: 'bg-blue-50   text-blue-700   border-blue-200'   },
  livrables:   { label: 'Livrables en cours', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  couvert:     { label: 'Couvert',        className: 'bg-green-50  text-green-700  border-green-200'  },
  archive:     { label: 'Archivé',        className: 'bg-muted     text-muted-foreground border-border' },
}

// ══════════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════════

function formatDateLongue(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

function formatDateLimite(dateStr: string | null): { label: string; retard: boolean } | null {
  if (!dateStr) return null
  const date  = new Date(dateStr + 'T00:00:00')
  const today = new Date(new Date().toDateString())
  const diff  = Math.round((date.getTime() - today.getTime()) / 86400000)
  if (diff < 0)   return { label: `Retard ${Math.abs(diff)} j.`, retard: true }
  if (diff === 0) return { label: "Aujourd'hui", retard: false }
  if (diff === 1) return { label: 'Demain',      retard: false }
  return { label: `Dans ${diff} j.`, retard: false }
}

// ══════════════════════════════════════════════════════════════════════════════
// Section 2 — Équipe
// ══════════════════════════════════════════════════════════════════════════════

function CarteRole({
  role, assignment, membres, culteId, disabled,
  onAssignChange, onStatutChange,
}: {
  role:           typeof ROLES_CONFIG[number]
  assignment:     PlanningAvecMembre | undefined
  membres:        MembreCaptation[]
  culteId:        string
  disabled:       boolean
  onAssignChange: (role: RoleCaptation, membreId: string | null) => void
  onStatutChange: (id: string, statut: StatutPlanning) => void
}) {
  const Icon          = ROLE_ICON[role.code]
  const membresRole   = membres.filter(m => m.roles.includes(role.code))
  const currentMembre = assignment?.membre_id ?? 'none'
  const statutCfg     = assignment ? STATUT_ASSIGN_CONFIG[assignment.statut] : null

  return (
    <Card className="flex-1 min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {role.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Dropdown membre */}
        <Select
          value={currentMembre}
          onValueChange={v => onAssignChange(role.code, v === 'none' ? null : v)}
          disabled={disabled}
        >
          <SelectTrigger className={cn(
            'h-9 text-sm',
            currentMembre === 'none' && 'bg-red-50 border-red-200 text-red-700',
          )}>
            <SelectValue placeholder="Non assigné" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Non assigné —</SelectItem>
            {membresRole.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.prenom} {m.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Badge statut + dropdown */}
        {assignment ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={disabled}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                  'cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-default disabled:opacity-60',
                  statutCfg?.className,
                )}
              >
                {statutCfg?.label}
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(Object.entries(STATUT_ASSIGN_CONFIG) as [StatutPlanning, { label: string }][]).map(([val, cfg]) => (
                <DropdownMenuItem
                  key={val}
                  onSelect={() => onStatutChange(assignment.id, val)}
                  className="flex items-center gap-2"
                >
                  {val === assignment.statut && <Check className="h-3.5 w-3.5" />}
                  <span className={val !== assignment.statut ? 'ml-[18px]' : ''}>{cfg.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
            Non assigné
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Section 3 — Livrables : schéma zod
// ══════════════════════════════════════════════════════════════════════════════

const livraisonSchema = z.object({
  type_livrable: z.enum(['video_brute', 'video_montee', 'photos_selectionnees', 'visuel_reseaux', 'autre']),
  nom_fichier:   z.string().min(1, 'Nom requis'),
  assignee_id:   z.string().nullable(),
  date_limite:   z.string().nullable(),
  lien_drive:    z.string().url('URL invalide').nullable().or(z.literal('')).transform(v => v || null),
  notes:         z.string().nullable(),
})
type LivraisonForm = z.infer<typeof livraisonSchema>

// ══════════════════════════════════════════════════════════════════════════════
// Section 3 — Modal ajout livrable
// ══════════════════════════════════════════════════════════════════════════════

function ModalAjoutLivrable({
  open, onOpenChange, membres, onSubmit, pending,
}: {
  open:         boolean
  onOpenChange: (v: boolean) => void
  membres:      MembreCaptation[]
  onSubmit:     (data: LivraisonForm) => void
  pending:      boolean
}) {
  const isMobile = useIsMobile()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<LivraisonForm>({
    resolver: zodResolver(livraisonSchema),
    defaultValues: {
      type_livrable: 'video_brute',
      nom_fichier:   '',
      assignee_id:   null,
      date_limite:   null,
      lien_drive:    null,
      notes:         null,
    },
  })

  function handleClose() { reset(); onOpenChange(false) }
  function onValid(data: LivraisonForm) { onSubmit(data) }

  const formContent = (
    <div className="space-y-4">
      {/* Type */}
      <div className="space-y-1.5">
        <Label>Type de livrable <span className="text-destructive">*</span></Label>
        <Select
          value={watch('type_livrable')}
          onValueChange={v => setValue('type_livrable', v as TypeLivrable)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.entries(TYPE_LIVRABLE_LABELS) as [TypeLivrable, string][]).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Nom */}
      <div className="space-y-1.5">
        <Label>Nom descriptif <span className="text-destructive">*</span></Label>
        <Input
          {...register('nom_fichier')}
          placeholder="ex: Vidéo culte 19 janv."
        />
        {errors.nom_fichier && (
          <p className="text-xs text-destructive">{errors.nom_fichier.message}</p>
        )}
      </div>

      {/* Assigné à */}
      <div className="space-y-1.5">
        <Label>Assigné à</Label>
        <Select
          value={watch('assignee_id') ?? 'none'}
          onValueChange={v => setValue('assignee_id', v === 'none' ? null : v)}
        >
          <SelectTrigger><SelectValue placeholder="— Non assigné —" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Non assigné —</SelectItem>
            {membres.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.prenom} {m.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date limite */}
      <div className="space-y-1.5">
        <Label>Date limite</Label>
        <Input
          type="date"
          {...register('date_limite')}
          onChange={e => setValue('date_limite', e.target.value || null)}
        />
      </div>

      {/* Lien Drive */}
      <div className="space-y-1.5">
        <Label>Lien Drive (optionnel)</Label>
        <Input
          {...register('lien_drive')}
          placeholder="https://drive.google.com/…"
          type="url"
        />
        {errors.lien_drive && (
          <p className="text-xs text-destructive">{errors.lien_drive.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea
          {...register('notes')}
          placeholder="Instructions, précisions…"
          className="resize-none"
          rows={2}
        />
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent className="max-h-[92dvh]">
          <SheetHeader>
            <SheetTitle>Ajouter un livrable</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <form id="livraison-form" onSubmit={handleSubmit(onValid)}>
              {formContent}
            </form>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={handleClose} disabled={pending}>Annuler</Button>
            <Button type="submit" form="livraison-form" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ajouter
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un livrable</DialogTitle>
        </DialogHeader>
        <form id="livraison-form" onSubmit={handleSubmit(onValid)}>
          {formContent}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={pending}>Annuler</Button>
          <Button type="submit" form="livraison-form" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Composant principal
// ══════════════════════════════════════════════════════════════════════════════

interface Props {
  culte:       CulteDetail
  assignments: PlanningAvecMembre[]
  livraisons:  LivraisonCaptation[]
  membres:     MembreCaptation[]
  membresById: Record<string, MembreCaptation>
  dossier:     DossierDrive | null
}

export function CulteDetailClient({
  culte: initialCulte,
  assignments: initialAssignments,
  livraisons:  initialLivraisons,
  membres,
  membresById,
  dossier:     initialDossier,
}: Props) {
  const [assignments, setAssignments] = useState<PlanningAvecMembre[]>(initialAssignments)
  const [livraisons,  setLivraisons]  = useState<LivraisonCaptation[]>(initialLivraisons)
  const [dossier,     setDossier]     = useState<DossierDrive | null>(initialDossier)
  const [notes,       setNotes]       = useState(initialCulte.notes_captation ?? '')
  const [notesSaved,  setNotesSaved]  = useState(true)
  const [modalLivraison, setModalLivraison] = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [isPending,   startTransition] = useTransition()
  const [livrPending, startLivr]      = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const statutGlobal = calculerStatutGlobal(initialCulte, assignments, livraisons)
  const sgCfg        = STATUT_GLOBAL_CONFIG[statutGlobal]

  // ── Assignments ────────────────────────────────────────────────────────────

  const byRole = Object.fromEntries(
    assignments.map(a => [a.role_du_jour, a])
  ) as Record<RoleCaptation, PlanningAvecMembre | undefined>

  function handleAssignChange(role: RoleCaptation, membreId: string | null) {
    const prev = [...assignments]
    if (membreId === null) {
      setAssignments(a => a.filter(x => x.role_du_jour !== role))
    } else {
      const existing = byRole[role]
      const membre   = membres.find(m => m.id === membreId)!
      if (existing) {
        setAssignments(a => a.map(x =>
          x.role_du_jour === role
            ? { ...x, membre_id: membreId, membres_captation: membre }
            : x
        ))
      } else {
        setAssignments(a => [
          ...a,
          {
            id: crypto.randomUUID(), culte_id: initialCulte.id, membre_id: membreId,
            role_du_jour: role, statut: 'planifie', notes: null, created_at: '',
            membres_captation: membre,
          },
        ])
      }
    }
    startTransition(async () => {
      const res = membreId === null
        ? await deleteAssignmentAction(initialCulte.id, role)
        : await upsertAssignmentAction(initialCulte.id, membreId, role)
      if (!res.success) {
        setAssignments(prev)
        setError(res.error)
      }
    })
  }

  function handleStatutChange(id: string, statut: StatutPlanning) {
    const prev = [...assignments]
    setAssignments(a => a.map(x => x.id === id ? { ...x, statut } : x))
    startTransition(async () => {
      const res = await updateStatutAssignmentAction(id, initialCulte.id, statut)
      if (!res.success) { setAssignments(prev); setError(res.error) }
    })
  }

  // ── Livrables ──────────────────────────────────────────────────────────────

  const handleAjouterLivraison = useCallback((data: LivraisonForm) => {
    startLivr(async () => {
      const res = await creerLivraisonAction(initialCulte.id, {
        type_livrable: data.type_livrable,
        nom_fichier:   data.nom_fichier,
        assignee_id:   data.assignee_id,
        date_limite:   data.date_limite,
        lien_drive:    data.lien_drive,
        notes:         data.notes,
      })
      if (!res.success) {
        toast.error(res.error)
      } else {
        toast.success('Livrable ajouté')
        setModalLivraison(false)
        // Optimistic: reload from server isn't possible in client — use a temp entry
        setLivraisons(prev => [
          ...prev,
          {
            id:            crypto.randomUUID(),
            culte_id:      initialCulte.id,
            type_livrable: data.type_livrable,
            nom_fichier:   data.nom_fichier,
            assignee_id:   data.assignee_id,
            date_limite:   data.date_limite,
            lien_drive:    data.lien_drive,
            statut:        'a_faire',
            notes:         data.notes,
            created_at:    new Date().toISOString(),
          },
        ])
      }
    })
  }, [initialCulte.id])

  function handleStatutLivraison(id: string, statut: StatutLivraison) {
    const prev = [...livraisons]
    setLivraisons(l => l.map(x => x.id === id ? { ...x, statut } : x))
    startLivr(async () => {
      const res = await updateStatutLivraisonAction(id, initialCulte.id, statut)
      if (!res.success) { setLivraisons(prev); toast.error(res.error) }
    })
  }

  function handleSupprimerLivraison(id: string) {
    const prev = [...livraisons]
    setLivraisons(l => l.filter(x => x.id !== id))
    startLivr(async () => {
      const res = await supprimerLivraisonAction(id, initialCulte.id)
      if (!res.success) { setLivraisons(prev); toast.error(res.error) }
    })
  }

  // ── Notes autosave ─────────────────────────────────────────────────────────

  function handleNotesChange(value: string) {
    setNotes(value)
    setNotesSaved(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await sauvegarderNotesAction(initialCulte.id, value)
      if (res.success) setNotesSaved(true)
      else toast.error('Erreur lors de la sauvegarde des notes')
    }, 2000)
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  // ══════════════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-8">

      {/* ── SECTION 1 : En-tête ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <Link
          href="/captation/planning"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au planning
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {capitalize(formatDateLongue(initialCulte.date_culte))}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {initialCulte.theme      && <span>📖 {initialCulte.theme}</span>}
              {initialCulte.predicateur && <span>🎤 {initialCulte.predicateur}</span>}
            </div>
          </div>
          <Badge variant="outline" className={cn('text-sm px-3 py-1', sgCfg.className)}>
            {sgCfg.label}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button className="ml-auto text-xs underline" onClick={() => setError(null)}>Fermer</button>
        </div>
      )}

      {/* ── SECTION 2 : Équipe ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Équipe présente</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          {ROLES_CONFIG.map(role => (
            <CarteRole
              key={role.code}
              role={role}
              assignment={byRole[role.code]}
              membres={membres}
              culteId={initialCulte.id}
              disabled={isPending}
              onAssignChange={handleAssignChange}
              onStatutChange={handleStatutChange}
            />
          ))}
        </div>
      </section>

      {/* ── SECTION 3 : Livrables ───────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Livrables à rendre</h2>
          <Button size="sm" className="gap-1.5" onClick={() => setModalLivraison(true)}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>

        {livraisons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 rounded-xl border border-dashed text-center">
            <p className="text-sm text-muted-foreground">Aucun livrable pour ce culte</p>
            <p className="text-xs text-muted-foreground/60">Cliquez sur « Ajouter » pour créer le premier livrable.</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Nom</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Assigné à</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Date limite</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {livraisons.map(livraison => {
                  const slCfg    = STATUT_LIVRAISON_CONFIG[livraison.statut]
                  const assignee = livraison.assignee_id ? membresById[livraison.assignee_id] : null
                  const dl       = formatDateLimite(livraison.date_limite)
                  return (
                    <TableRow key={livraison.id}>
                      <TableCell className="text-xs font-medium py-2.5">
                        {TYPE_LIVRABLE_LABELS[livraison.type_livrable]}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 max-w-[160px] truncate">
                        {livraison.nom_fichier ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 hidden sm:table-cell">
                        {assignee ? `${assignee.prenom} ${assignee.nom}` : '—'}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 hidden md:table-cell">
                        {dl ? (
                          <span className={cn(dl.retard && 'text-destructive font-medium')}>
                            {dl.label}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              disabled={livrPending}
                              className={cn(
                                'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-default',
                                slCfg.className,
                              )}
                            >
                              {slCfg.label}
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(Object.entries(STATUT_LIVRAISON_CONFIG) as [StatutLivraison, { label: string }][]).map(([val, cfg]) => (
                              <DropdownMenuItem
                                key={val}
                                onSelect={() => handleStatutLivraison(livraison.id, val)}
                                className="flex items-center gap-2"
                              >
                                {val === livraison.statut && <Check className="h-3.5 w-3.5" />}
                                <span className={val !== livraison.statut ? 'ml-[18px]' : ''}>{cfg.label}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <button
                          onClick={() => handleSupprimerLivraison(livraison.id)}
                          disabled={livrPending}
                          className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <ModalAjoutLivrable
          open={modalLivraison}
          onOpenChange={setModalLivraison}
          membres={membres}
          onSubmit={handleAjouterLivraison}
          pending={livrPending}
        />
      </section>

      {/* ── SECTION 4 : Google Drive ─────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Dossier Google Drive</h2>
        <DossierDriveCard
          culteId={initialCulte.id}
          dossier={dossier}
          onUpdate={setDossier}
        />
      </section>

      {/* ── SECTION 5 : Notes libres ─────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Notes sur ce culte</h2>
          {!notesSaved && (
            <span className="text-xs text-muted-foreground animate-pulse">Sauvegarde…</span>
          )}
          {notesSaved && notes.length > 0 && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> Sauvegardé
            </span>
          )}
        </div>
        <Textarea
          value={notes}
          onChange={e => handleNotesChange(e.target.value)}
          placeholder="Notes de production, observations, points à améliorer…"
          className="min-h-[120px] resize-y"
          rows={5}
        />
      </section>
    </div>
  )
}
