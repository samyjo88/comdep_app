'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ChevronLeft, ChevronRight, Plus, List, CalendarDays,
  Camera, ImageIcon, Palette, Loader2, AlertCircle, Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button }                from '@/components/ui/button'
import { Badge }                  from '@/components/ui/badge'
import { Card, CardContent }      from '@/components/ui/card'
import { Label }                  from '@/components/ui/label'
import { Input }                  from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet, SheetBody, SheetContent, SheetDescription,
  SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-media-query'
import { ROLES_CONFIG } from '@/types/captation'
import type {
  MembreCaptation, PlanningCulteComplet, PlanningAvecMembre,
  RoleCaptation, StatutPlanning,
} from '@/types/captation'
import {
  creerCulteAction, upsertAssignmentAction,
  deleteAssignmentAction, updateStatutAssignmentAction,
} from '@/app/captation/planning/actions'

// ── Config ─────────────────────────────────────────────────────────────────

const MOIS_NOMS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

const JOURS_HEADER = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

const ROLE_ICON: Record<RoleCaptation, typeof Camera> = {
  cameraman:     Camera,
  photographe:   ImageIcon,
  infographiste: Palette,
}

type StatutGlobal = 'incomplet' | 'planifie' | 'confirme' | 'couvert'

const STATUT_GLOBAL_CONFIG: Record<StatutGlobal, { label: string; className: string }> = {
  incomplet: { label: 'Incomplet', className: 'bg-red-50 text-red-700 border-red-200' },
  planifie:  { label: 'Planifié',  className: 'bg-gray-100 text-gray-600 border-gray-200' },
  confirme:  { label: 'Confirmé',  className: 'bg-blue-50 text-blue-700 border-blue-200' },
  couvert:   { label: 'Couvert',   className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

const STATUT_ASSIGN_CONFIG: Record<StatutPlanning, { label: string; className: string }> = {
  planifie: { label: 'Planifié',  className: 'bg-gray-100 text-gray-600 border-gray-200' },
  confirme: { label: 'Confirmé',  className: 'bg-blue-50 text-blue-700 border-blue-200' },
  present:  { label: 'Présent',   className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  absent:   { label: 'Absent',    className: 'bg-red-50 text-red-700 border-red-200' },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateLongue(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const first   = new Date(year, month, 1)
  const last    = new Date(year, month + 1, 0)
  const startDow = (first.getDay() + 6) % 7
  const days: (Date | null)[] = []
  for (let i = 0; i < startDow; i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function statutGlobal(item: PlanningCulteComplet): StatutGlobal {
  const { assignments, culte } = item
  const passe = culte.date_culte < todayStr()
  if (assignments.length < 3) return 'incomplet'
  if (passe && assignments.every(a => a.statut === 'present')) return 'couvert'
  if (assignments.every(a => a.statut === 'confirme' || a.statut === 'present')) return 'confirme'
  return 'planifie'
}

// ── CelleAssignation ───────────────────────────────────────────────────────

function CelleAssignation({
  culteId, role, assignment, membres, disabled, onAssignChange,
}: {
  culteId:         string
  role:            RoleCaptation
  assignment:      PlanningAvecMembre | undefined
  membres:         MembreCaptation[]
  disabled:        boolean
  onAssignChange:  (culteId: string, role: RoleCaptation, membreId: string | null) => void
}) {
  const membresRole  = membres.filter(m => m.roles.includes(role))
  const currentValue = assignment?.membre_id ?? 'none'

  function handleChange(value: string) {
    onAssignChange(culteId, role, value === 'none' ? null : value)
  }

  return (
    <Select value={currentValue} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className={cn(
        'h-8 text-xs border shadow-none focus:ring-0 focus:ring-offset-0',
        currentValue === 'none'
          ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-background',
      )}>
        <SelectValue placeholder="Non assigné" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">— Non assigné —</SelectItem>
        {membresRole.map(m => (
          <SelectItem key={m.id} value={m.id}>
            {m.prenom} {m.nom}
          </SelectItem>
        ))}
        {membresRole.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Aucun membre avec ce rôle
          </div>
        )}
      </SelectContent>
    </Select>
  )
}

// ── CelleStatut ────────────────────────────────────────────────────────────

function CelleStatut({
  assignment, disabled, onStatutChange,
}: {
  assignment:     PlanningAvecMembre
  disabled:       boolean
  onStatutChange: (id: string, culteId: string, role: RoleCaptation, statut: StatutPlanning) => void
}) {
  const cfg = STATUT_ASSIGN_CONFIG[assignment.statut]

  return (
    <Select
      value={assignment.statut}
      onValueChange={v => onStatutChange(assignment.id, assignment.culte_id, assignment.role_du_jour, v as StatutPlanning)}
      disabled={disabled}
    >
      <SelectTrigger className="h-7 w-28 border-0 shadow-none bg-transparent focus:ring-0 focus:ring-offset-0 p-0">
        <Badge variant="outline" className={cn('text-xs font-medium pointer-events-none', cfg.className)}>
          {cfg.label}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="planifie">Planifié</SelectItem>
        <SelectItem value="confirme">Confirmé</SelectItem>
        <SelectItem value="present">Présent</SelectItem>
        <SelectItem value="absent">Absent</SelectItem>
      </SelectContent>
    </Select>
  )
}

// ── CulteCard (vue liste) ──────────────────────────────────────────────────

function CulteCard({
  item, membres, isPending, onAssignChange, onStatutChange,
}: {
  item:            PlanningCulteComplet
  membres:         MembreCaptation[]
  isPending:       boolean
  onAssignChange:  (culteId: string, role: RoleCaptation, membreId: string | null) => void
  onStatutChange:  (id: string, culteId: string, role: RoleCaptation, statut: StatutPlanning) => void
}) {
  const { culte, assignments } = item
  const passe  = culte.date_culte < todayStr()
  const statut = statutGlobal(item)
  const cfg    = STATUT_GLOBAL_CONFIG[statut]

  const [rappelPending, setRappelPending] = useState(false)

  async function envoyerRappels() {
    if (rappelPending) return
    setRappelPending(true)
    try {
      const res  = await fetch('/api/captation/rappel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ culte_id: culte.id }),
      })
      const json = await res.json() as { envoyes?: number; erreurs?: string[]; error?: string; message?: string }
      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Erreur lors de l\'envoi des rappels')
      } else if (json.envoyes === 0) {
        toast.info(json.message ?? 'Aucun membre avec email à notifier')
      } else {
        const nb = json.envoyes ?? 0
        toast.success(`Rappels envoyés à ${nb} membre${nb > 1 ? 's' : ''}`)
        if (json.erreurs && json.erreurs.length > 0) {
          toast.warning(`${json.erreurs.length} envoi(s) échoué(s)`)
        }
      }
    } catch {
      toast.error('Impossible de contacter le serveur')
    } finally {
      setRappelPending(false)
    }
  }

  const byRole = Object.fromEntries(
    assignments.map(a => [a.role_du_jour, a])
  ) as Record<RoleCaptation, PlanningAvecMembre | undefined>

  return (
    <Card className={cn('transition-opacity', passe && 'opacity-70')}>
      <CardContent className="p-4 space-y-3">

        {/* En-tête : date + statut global */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="font-semibold text-sm truncate">
              {capitalize(formatDateLongue(culte.date_culte))}
            </p>
          </div>
          <Badge variant="outline" className={cn('text-xs shrink-0', cfg.className)}>
            {cfg.label}
          </Badge>
        </div>

        {/* Séparateur */}
        <div className="border-t" />

        {/* 3 rôles */}
        <div className="space-y-2">
          {ROLES_CONFIG.map(role => {
            const RoleIcon   = ROLE_ICON[role.code]
            const assignment = byRole[role.code]
            return (
              <div key={role.code} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                {/* Icône + label */}
                <div className="flex items-center gap-1.5 w-32 shrink-0">
                  <RoleIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{role.label}</span>
                </div>

                {/* Dropdown membre */}
                <CelleAssignation
                  culteId={culte.id}
                  role={role.code}
                  assignment={assignment}
                  membres={membres}
                  disabled={isPending}
                  onAssignChange={onAssignChange}
                />

                {/* Badge statut (si assigné) */}
                <div className="w-28 flex justify-end">
                  {assignment ? (
                    <CelleStatut
                      assignment={assignment}
                      disabled={isPending}
                      onStatutChange={onStatutChange}
                    />
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-red-50 text-red-600 border-red-200">
                      À assigner
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1 border-t">
          <Button
            variant="ghost" size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={envoyerRappels}
            disabled={rappelPending || assignments.length === 0}
          >
            {rappelPending
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Mail className="h-3 w-3" />
            }
            Rappel
          </Button>

          <Link href={`/captation/culte/${culte.id}`}>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
              Voir détail
              <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

      </CardContent>
    </Card>
  )
}

// ── Vue Calendrier ─────────────────────────────────────────────────────────

function VueCalendrier({
  planning, membres, annee, mois,
}: {
  planning: PlanningCulteComplet[]
  membres:  MembreCaptation[]
  annee:    number
  mois:     number
}) {
  const days  = getCalendarDays(annee, mois - 1)
  const today = todayStr()

  const itemByDate = Object.fromEntries(
    planning.map(item => [item.culte.date_culte, item])
  )
  const membreById = Object.fromEntries(membres.map(m => [m.id, m]))

  return (
    <div className="rounded-xl border overflow-hidden">
      {/* Header jours */}
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {JOURS_HEADER.map(j => (
          <div key={j} className={cn(
            'py-2 text-center text-xs font-semibold text-muted-foreground',
            j === 'Dim' && 'text-primary',
          )}>
            {j}
          </div>
        ))}
      </div>

      {/* Cellules */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="min-h-[80px] border-b border-r bg-muted/5 last:border-r-0" />
          }

          const dateStr    = dateToStr(day)
          const item       = itemByDate[dateStr]
          const isDimanche = day.getDay() === 0
          const isToday    = dateStr === today
          const passe      = dateStr < today
          const colIdx     = idx % 7
          const allAssigned = item && item.assignments.length === 3

          return (
            <div
              key={dateStr}
              className={cn(
                'min-h-[80px] p-1.5 border-b flex flex-col gap-1',
                colIdx < 6 && 'border-r',
                isDimanche && 'bg-primary/[0.025]',
                passe && 'opacity-50',
              )}
            >
              <span className={cn(
                'text-xs font-medium self-start',
                isDimanche ? 'text-primary font-semibold' : 'text-foreground',
                isToday && 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px]',
              )}>
                {day.getDate()}
              </span>

              {item && (
                <div className={cn(
                  'rounded p-1 flex flex-col gap-0.5 text-[10px] leading-tight',
                  allAssigned ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100',
                )}>
                  {item.assignments.map(a => {
                    const m = membreById[a.membre_id]
                    if (!m) return null
                    return (
                      <span key={a.id} className={cn(
                        'truncate font-medium',
                        allAssigned ? 'text-emerald-700' : 'text-red-700',
                      )}>
                        {m.prenom[0]}.{m.nom[0]}. <span className="opacity-70">·</span> {ROLES_CONFIG.find(r => r.code === a.role_du_jour)?.label.slice(0, 3)}
                      </span>
                    )
                  })}
                  {item.assignments.length < 3 && (
                    <span className="text-red-500 font-medium">
                      {3 - item.assignments.length} rôle{3 - item.assignments.length > 1 ? 's' : ''} manquant{3 - item.assignments.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Modal : ajouter un culte ───────────────────────────────────────────────

function AjouterCulteModal({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void
}) {
  const isMobile = useIsMobile()
  const [dateVal, setDateVal]        = useState('')
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) { setDateVal(''); setError(null) }
  }, [open])

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!dateVal) { setError('Choisissez une date.'); return }
    setError(null)
    startTransition(async () => {
      const res = await creerCulteAction(dateVal)
      if (!res.success) { setError(res.error); return }
      onOpenChange(false)
      onCreated()
    })
  }

  const formContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="date_culte">Date du culte</Label>
        <Input
          id="date_culte" type="date" value={dateVal}
          onChange={e => setDateVal(e.target.value)}
          required className="min-h-[44px]"
        />
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Ajouter un culte</SheetTitle>
            <SheetDescription>Choisissez la date du culte à planifier.</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <form id="add-culte-form" onSubmit={handleSubmit}>{formContent}</form>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="min-h-[44px]">
              Annuler
            </Button>
            <Button type="submit" form="add-culte-form" disabled={isPending} className="min-h-[44px]">
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Créer le culte
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajouter un culte</DialogTitle>
          <DialogDescription>Choisissez la date du culte à planifier.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formContent}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Créer le culte
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Composant principal ────────────────────────────────────────────────────

type Vue = 'liste' | 'calendrier'

export function PlanningCaptationClient({
  initialPlanning, membres, annee, mois,
}: {
  initialPlanning: PlanningCulteComplet[]
  membres:         MembreCaptation[]
  annee:           number
  mois:            number
}) {
  const router = useRouter()

  const [vue, setVue]             = useState<Vue>('liste')
  const [planning, setPlanning]   = useState(initialPlanning)
  const [modalAdd, setModalAdd]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => { setPlanning(initialPlanning) }, [initialPlanning])

  // ── Navigation mois ──────────────────────────────────────────────────────

  function naviguerMois(delta: number) {
    let newMois  = mois + delta
    let newAnnee = annee
    if (newMois > 12) { newMois = 1;  newAnnee++ }
    if (newMois < 1)  { newMois = 12; newAnnee-- }
    router.push(`/captation/planning?annee=${newAnnee}&mois=${newMois}`)
  }

  // ── Gestion assignments ──────────────────────────────────────────────────

  function handleAssignChange(culteId: string, role: RoleCaptation, membreId: string | null) {
    const snapshot = planning

    // Optimistic
    setPlanning(prev => prev.map(item => {
      if (item.culte.id !== culteId) return item
      if (!membreId) {
        return { ...item, assignments: item.assignments.filter(a => a.role_du_jour !== role) }
      }
      const membre = membres.find(m => m.id === membreId)
      if (!membre) return item
      const existing = item.assignments.find(a => a.role_du_jour === role)
      if (existing) {
        return {
          ...item,
          assignments: item.assignments.map(a => a.role_du_jour === role
            ? { ...a, membre_id: membreId, membres_captation: membre }
            : a
          ),
        }
      }
      const newA: PlanningAvecMembre = {
        id:                 `tmp-${Date.now()}`,
        culte_id:           culteId,
        membre_id:          membreId,
        role_du_jour:       role,
        statut:             'planifie',
        notes:              null,
        created_at:         new Date().toISOString(),
        membres_captation:  membre,
      }
      return { ...item, assignments: [...item.assignments, newA] }
    }))

    startTransition(async () => {
      const res = membreId
        ? await upsertAssignmentAction(culteId, membreId, role)
        : await deleteAssignmentAction(culteId, role)
      if (!res.success) {
        setPlanning(snapshot)
        setError(res.error)
      } else {
        setError(null)
      }
    })
  }

  function handleStatutChange(id: string, culteId: string, role: RoleCaptation, statut: StatutPlanning) {
    const snapshot = planning

    setPlanning(prev => prev.map(item => {
      if (item.culte.id !== culteId) return item
      return {
        ...item,
        assignments: item.assignments.map(a => a.role_du_jour === role ? { ...a, statut, id } : a),
      }
    }))

    startTransition(async () => {
      const res = await updateStatutAssignmentAction(id, statut)
      if (!res.success) {
        setPlanning(snapshot)
        setError(res.error)
      } else {
        setError(null)
      }
    })
  }

  // ── Résumé du mois ───────────────────────────────────────────────────────

  const nbTotal     = planning.length
  const nbComplets  = planning.filter(item => item.assignments.length === 3).length
  const membresSet  = new Set(planning.flatMap(item => item.assignments.map(a => a.membre_id)))
  const nbMobilises = membresSet.size

  const moisLabel = `${MOIS_NOMS[mois - 1]} ${annee}`

  return (
    <div className="space-y-5">

      {/* Barre outils */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        {/* Navigation mois */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => naviguerMois(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-base font-semibold min-w-[140px] text-center">{moisLabel}</h2>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => naviguerMois(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Toggle vue */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(['liste', 'calendrier'] as Vue[]).map(v => (
              <button
                key={v}
                onClick={() => setVue(v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  vue === v
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {v === 'liste'
                  ? <><List className="h-4 w-4" /> <span className="hidden sm:inline">Liste</span></>
                  : <><CalendarDays className="h-4 w-4" /> <span className="hidden sm:inline">Calendrier</span></>
                }
              </button>
            ))}
          </div>

          <Button
            size="sm" className="gap-1.5 min-h-[36px]"
            onClick={() => setModalAdd(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter un culte</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Spinner discret pendant une action */}
      {isPending && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Enregistrement…
        </div>
      )}

      {/* Vue active */}
      {vue === 'liste' ? (
        planning.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-xl border border-dashed text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium text-muted-foreground">Aucun culte ce mois-ci</p>
            <p className="text-sm text-muted-foreground/60">
              Cliquez sur &quot;Ajouter un culte&quot; pour planifier une date.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...planning]
              .sort((a, b) => a.culte.date_culte.localeCompare(b.culte.date_culte))
              .map(item => (
                <CulteCard
                  key={item.culte.id}
                  item={item}
                  membres={membres}
                  isPending={isPending}
                  onAssignChange={handleAssignChange}
                  onStatutChange={handleStatutChange}
                />
              ))
            }
          </div>
        )
      ) : (
        <VueCalendrier
          planning={planning}
          membres={membres}
          annee={annee}
          mois={mois}
        />
      )}

      {/* Résumé du mois */}
      {nbTotal > 0 && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground flex flex-wrap gap-2 items-center">
          <span>
            <span className="font-semibold text-foreground">{nbComplets}/{nbTotal}</span>{' '}
            culte{nbTotal > 1 ? 's' : ''} entièrement assigné{nbComplets > 1 ? 's' : ''}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>
            <span className="font-semibold text-foreground">{nbMobilises}</span>{' '}
            membre{nbMobilises > 1 ? 's' : ''} mobilisé{nbMobilises > 1 ? 's' : ''}
          </span>
        </div>
      )}

      <AjouterCulteModal
        open={modalAdd}
        onOpenChange={setModalAdd}
        onCreated={() => router.refresh()}
      />
    </div>
  )
}
