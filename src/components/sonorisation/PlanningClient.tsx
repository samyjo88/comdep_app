'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  CalendarDays, List, ChevronLeft, ChevronRight,
  Plus, Trash2, Loader2, UserX, Bell, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'

import { useIsMobile } from '@/hooks/use-media-query'
import {
  creerCulte, modifierAssignation, modifierStatutCulte, supprimerCulte,
} from '@/lib/sonorisation/planning-actions'
import type { PlanningCulte, MembreSon, StatutCulte } from '@/lib/supabase/types'

// ── Config ──────────────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<StatutCulte, { label: string; className: string }> = {
  planifie: { label: 'Planifié',  className: 'bg-gray-100 text-gray-700 border-gray-200' },
  confirme: { label: 'Confirmé',  className: 'bg-green-100 text-green-800 border-green-200' },
  passe:    { label: 'Passé',     className: 'bg-gray-50 text-gray-400 border-gray-100' },
}

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const JOURS_HEADER = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

// ── Helpers ─────────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isPassee(dateStr: string): boolean {
  return dateStr < todayStr()
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDateCourt(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const first    = new Date(year, month, 1)
  const last     = new Date(year, month + 1, 0)
  const startDow = (first.getDay() + 6) % 7
  const days: (Date | null)[] = []
  for (let i = 0; i < startDow; i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Cellule assignation ──────────────────────────────────────────────────────

type RoleAssign = 'responsable' | 'assistant1' | 'assistant2'

function CelleAssignation({
  planningId, role, currentId, membres, disabled,
}: {
  planningId: number
  role: RoleAssign
  currentId: number | null
  membres: MembreSon[]
  disabled?: boolean
}) {
  const [localVal, setLocalVal]       = useState<string>(currentId?.toString() ?? 'none')
  const [isPending, startTransition]  = useTransition()

  useEffect(() => { setLocalVal(currentId?.toString() ?? 'none') }, [currentId])

  function handleChange(value: string) {
    const newId = value === 'none' ? null : parseInt(value)
    setLocalVal(value)
    startTransition(async () => { await modifierAssignation(planningId, role, newId) })
  }

  const isUnassigned = localVal === 'none'

  return (
    <div className="space-y-1 min-w-[140px]">
      {isUnassigned && (
        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 font-normal gap-1">
          <UserX className="h-3 w-3" />
          Non assigné
        </Badge>
      )}
      <Select value={localVal} onValueChange={handleChange} disabled={disabled || isPending}>
        <SelectTrigger className={cn(
          'h-8 text-xs border-0 shadow-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0',
          isPending && 'opacity-50',
          isUnassigned && 'text-muted-foreground',
        )}>
          <SelectValue placeholder="Choisir…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— Non assigné —</SelectItem>
          {membres.map(m => (
            <SelectItem key={m.id} value={m.id.toString()}>
              {m.prenom} {m.nom}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// ── Cellule statut ───────────────────────────────────────────────────────────

function CelleStatut({ planningId, statut, forcePasse }: {
  planningId: number; statut: StatutCulte; forcePasse: boolean
}) {
  const [local, setLocal]             = useState<StatutCulte>(forcePasse ? 'passe' : statut)
  const [isPending, startTransition]  = useTransition()

  useEffect(() => { setLocal(forcePasse ? 'passe' : statut) }, [statut, forcePasse])

  function handleChange(val: string) {
    const s = val as StatutCulte
    setLocal(s)
    startTransition(async () => { await modifierStatutCulte(planningId, s) })
  }

  const cfg = STATUT_CONFIG[local]

  return (
    <Select value={local} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-32 border-0 shadow-none bg-transparent focus:ring-0 focus:ring-offset-0">
        <Badge variant="outline" className={cn('text-xs font-medium pointer-events-none', cfg.className)}>
          {cfg.label}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="planifie">Planifié</SelectItem>
        <SelectItem value="confirme">Confirmé</SelectItem>
        <SelectItem value="passe">Passé</SelectItem>
      </SelectContent>
    </Select>
  )
}

// ── Vue Liste — desktop ──────────────────────────────────────────────────────

function VueListeDesktop({ plannings, membres }: { plannings: PlanningCulte[]; membres: MembreSon[] }) {
  const [isPending, startTransition] = useTransition()
  const sorted = [...plannings].sort((a, b) => a.date_culte.localeCompare(b.date_culte))

  function handleDelete(id: number) {
    if (!confirm('Supprimer ce culte du planning ?')) return
    startTransition(async () => { await supprimerCulte(id) })
  }

  if (sorted.length === 0) return <ListeVide />

  return (
    <div className="rounded-xl border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="font-semibold whitespace-nowrap">Date culte</TableHead>
            <TableHead className="font-semibold">Responsable</TableHead>
            <TableHead className="font-semibold">Assistant 1</TableHead>
            <TableHead className="font-semibold">Assistant 2</TableHead>
            <TableHead className="font-semibold">Statut</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(culte => {
            const passe = isPassee(culte.date_culte)
            return (
              <TableRow key={culte.id} className={cn(passe && 'opacity-50 bg-muted/10')}>
                <TableCell className="font-medium text-sm whitespace-nowrap capitalize">
                  {formatDateLong(culte.date_culte)}
                </TableCell>
                <TableCell>
                  <CelleAssignation planningId={culte.id} role="responsable" currentId={culte.responsable_id} membres={membres} disabled={passe} />
                </TableCell>
                <TableCell>
                  <CelleAssignation planningId={culte.id} role="assistant1" currentId={culte.assistant1_id} membres={membres} disabled={passe} />
                </TableCell>
                <TableCell>
                  <CelleAssignation planningId={culte.id} role="assistant2" currentId={culte.assistant2_id} membres={membres} disabled={passe} />
                </TableCell>
                <TableCell>
                  <CelleStatut planningId={culte.id} statut={culte.statut} forcePasse={passe} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(culte.id)} disabled={isPending} title="Supprimer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// ── Vue Liste — mobile (cartes empilées) ─────────────────────────────────────

function CulteCardMobile({ culte, membres }: { culte: PlanningCulte; membres: MembreSon[] }) {
  const [isPending, startTransition] = useTransition()
  const passe = isPassee(culte.date_culte)
  const cfg   = STATUT_CONFIG[culte.statut]

  function handleDelete() {
    if (!confirm('Supprimer ce culte du planning ?')) return
    startTransition(async () => { await supprimerCulte(culte.id) })
  }

  return (
    <Card className={cn('transition-opacity', passe && 'opacity-60 bg-muted/10')}>
      <CardContent className="pt-4 space-y-3">
        {/* Date + statut */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm capitalize leading-snug">
            {formatDateCourt(culte.date_culte)}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={cn('text-xs font-medium', cfg.className)}>
              {cfg.label}
            </Badge>
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleDelete} disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Assignations */}
        <div className="space-y-2 border-t pt-3">
          {(
            [
              { label: 'Responsable', role: 'responsable' as RoleAssign, id: culte.responsable_id },
              { label: 'Assistant 1', role: 'assistant1'  as RoleAssign, id: culte.assistant1_id  },
              { label: 'Assistant 2', role: 'assistant2'  as RoleAssign, id: culte.assistant2_id  },
            ] as const
          ).map(({ label, role, id }) => (
            <div key={role} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
              <div className="flex-1 min-w-0">
                <CelleAssignation
                  planningId={culte.id}
                  role={role}
                  currentId={id}
                  membres={membres}
                  disabled={passe}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Changer statut */}
        {!passe && (
          <div className="border-t pt-3">
            <CelleStatut planningId={culte.id} statut={culte.statut} forcePasse={false} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ListeVide() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-xl border border-dashed text-center">
      <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
      <p className="font-medium text-muted-foreground">Aucun culte planifié</p>
      <p className="text-sm text-muted-foreground/60">
        Cliquez sur &quot;+ Ajouter un culte&quot; pour commencer.
      </p>
    </div>
  )
}

function VueListe({ plannings, membres }: { plannings: PlanningCulte[]; membres: MembreSon[] }) {
  const isMobile = useIsMobile()
  const sorted   = [...plannings].sort((a, b) => a.date_culte.localeCompare(b.date_culte))

  if (sorted.length === 0) return <ListeVide />

  if (isMobile) {
    return (
      <div className="space-y-3">
        {sorted.map(culte => (
          <CulteCardMobile key={culte.id} culte={culte} membres={membres} />
        ))}
      </div>
    )
  }

  return <VueListeDesktop plannings={plannings} membres={membres} />
}

// ── Vue Calendrier ───────────────────────────────────────────────────────────

function VueCalendrier({
  plannings, membres, moisAffiche, onChangeMois, onClickDimanche,
}: {
  plannings: PlanningCulte[]
  membres: MembreSon[]
  moisAffiche: Date
  onChangeMois: (d: Date) => void
  onClickDimanche: (dateStr: string, culte?: PlanningCulte) => void
}) {
  const year  = moisAffiche.getFullYear()
  const month = moisAffiche.getMonth()
  const days  = getCalendarDays(year, month)
  const today = todayStr()

  const culteByDate: Record<string, PlanningCulte> =
    Object.fromEntries(plannings.map(p => [p.date_culte, p]))
  const membreById: Record<number, MembreSon> =
    Object.fromEntries(membres.map(m => [m.id, m]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" className="h-9 w-9"
          onClick={() => onChangeMois(new Date(year, month - 1, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-base font-semibold">{MOIS_NOMS[month]} {year}</h3>
        <Button variant="outline" size="icon" className="h-9 w-9"
          onClick={() => onChangeMois(new Date(year, month + 1, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-xl border overflow-hidden">
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

        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="min-h-[70px] md:min-h-[90px] border-b border-r bg-muted/5 last:border-r-0" />
            }

            const dateStr    = dateToStr(day)
            const culte      = culteByDate[dateStr]
            const isDimanche = day.getDay() === 0
            const isToday    = dateStr === today
            const passe      = dateStr < today
            const colIdx     = idx % 7

            const hasUnassigned = culte && (
              !culte.responsable_id || !culte.assistant1_id || !culte.assistant2_id
            )

            return (
              <div
                key={dateStr}
                onClick={() => isDimanche && onClickDimanche(dateStr, culte)}
                className={cn(
                  'min-h-[70px] md:min-h-[90px] p-1 md:p-1.5 border-b flex flex-col gap-1 transition-colors',
                  colIdx < 6 && 'border-r',
                  isDimanche && !passe && 'cursor-pointer hover:bg-primary/5',
                  isDimanche && 'bg-primary/[0.025]',
                  passe && 'opacity-50',
                )}
              >
                <span className={cn(
                  'text-xs font-medium self-start leading-none',
                  isDimanche ? 'text-primary font-semibold' : 'text-foreground',
                  isToday && 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center font-bold',
                )}>
                  {day.getDate()}
                </span>

                {culte && (
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {[culte.responsable_id, culte.assistant1_id, culte.assistant2_id]
                      .filter(Boolean)
                      .map(id => membreById[id!])
                      .filter(Boolean)
                      .map(m => (
                        <span key={m.id}
                          className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5 truncate leading-tight">
                          {m.prenom[0]}. {m.nom[0]}.
                        </span>
                      ))
                    }
                    {hasUnassigned && (
                      <Badge variant="outline"
                        className="text-xs bg-red-50 text-red-700 border-red-200 font-normal px-1 py-0 h-4 hidden md:flex">
                        Incomplet
                      </Badge>
                    )}
                    {hasUnassigned && (
                      <span className="w-2 h-2 rounded-full bg-red-500 self-start md:hidden" title="Incomplet" />
                    )}
                  </div>
                )}

                {isDimanche && !culte && !passe && (
                  <span className="text-xs text-muted-foreground/40 mt-auto select-none hidden md:block">
                    + Ajouter
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-primary/10 inline-block" />
          Membre assigné
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-red-200 bg-red-50 inline-block" />
          Rôle(s) manquant(s)
        </span>
        <span className="hidden md:inline">
          Cliquez sur un dimanche pour gérer l&apos;assignation
        </span>
        <span className="md:hidden">
          Appuyez sur un dimanche pour assigner
        </span>
      </div>
    </div>
  )
}

// ── Modal : ajouter un culte ─────────────────────────────────────────────────

function AjouterCulteModal({ open, onOpenChange, datePrefilled }: {
  open: boolean; onOpenChange: (v: boolean) => void; datePrefilled: string | null
}) {
  const isMobile = useIsMobile()
  const [dateVal, setDateVal]        = useState('')
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) { setDateVal(datePrefilled ?? ''); setError(null) }
  }, [open, datePrefilled])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dateVal) { setError('Choisissez une date'); return }
    setError(null)
    startTransition(async () => {
      const result = await creerCulte(dateVal)
      if (!result.success) { setError(result.error); return }
      onOpenChange(false)
    })
  }

  const formContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="date_culte">Date du culte</Label>
        <Input id="date_culte" type="date" value={dateVal}
          onChange={e => setDateVal(e.target.value)} required className="min-h-[44px]" />
      </div>
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
            <form id="culte-form" onSubmit={handleSubmit}>
              {formContent}
            </form>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="min-h-[44px]">
              Annuler
            </Button>
            <Button type="submit" form="culte-form" disabled={isPending} className="min-h-[44px]">
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
          <DialogDescription>
            Choisissez la date du culte à planifier. Les membres seront assignés ensuite.
          </DialogDescription>
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

// ── Modal : assignation depuis calendrier ────────────────────────────────────

function CulteAssignModal({ open, onOpenChange, culteId, plannings, membres, dateStr }: {
  open: boolean; onOpenChange: (v: boolean) => void
  culteId: number | null; plannings: PlanningCulte[]
  membres: MembreSon[]; dateStr: string
}) {
  const isMobile = useIsMobile()
  const culte    = plannings.find(p => p.id === culteId) ?? null
  if (!culte) return null

  const assignContent = (
    <div className="space-y-4">
      {(
        [
          { role: 'responsable' as RoleAssign, label: 'Responsable', id: culte.responsable_id },
          { role: 'assistant1'  as RoleAssign, label: 'Assistant 1', id: culte.assistant1_id  },
          { role: 'assistant2'  as RoleAssign, label: 'Assistant 2', id: culte.assistant2_id  },
        ] as const
      ).map(({ role, label, id }) => (
        <div key={role} className="flex items-center gap-4">
          <span className="text-sm font-medium shrink-0 w-24">{label}</span>
          <div className="flex-1">
            <CelleAssignation planningId={culte.id} role={role} currentId={id} membres={membres} />
          </div>
        </div>
      ))}
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Assignation</SheetTitle>
            <SheetDescription className="capitalize">{formatDateLong(dateStr)}</SheetDescription>
          </SheetHeader>
          <SheetBody>{assignContent}</SheetBody>
          <SheetFooter>
            <Button onClick={() => onOpenChange(false)} className="min-h-[44px]">Fermer</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assignation</DialogTitle>
          <DialogDescription className="capitalize">{formatDateLong(dateStr)}</DialogDescription>
        </DialogHeader>
        <div className="py-2">{assignContent}</div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Composant principal ──────────────────────────────────────────────────────

type Vue = 'liste' | 'calendrier'

export function PlanningClient({ plannings, membres }: {
  plannings: PlanningCulte[]
  membres: MembreSon[]
}) {
  const [vue, setVue] = useState<Vue>('liste')
  const [moisAffiche, setMoisAffiche] = useState<Date>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const [modalAddOpen, setModalAddOpen]       = useState(false)
  const [datePrefilled, setDatePrefilled]     = useState<string | null>(null)
  const [modalAssignOpen, setModalAssignOpen] = useState(false)
  const [culteIdSel, setCulteIdSel]           = useState<number | null>(null)
  const [dateSel, setDateSel]                 = useState('')

  type RappelEtat = 'idle' | 'loading' | 'success' | 'error'
  const [rappelEtat, setRappelEtat] = useState<RappelEtat>('idle')
  const [rappelMsg,  setRappelMsg]  = useState('')

  async function envoyerRappels() {
    setRappelEtat('loading')
    try {
      const res  = await fetch('/api/notifications/rappel-culte')
      const json = await res.json() as { success?: boolean; sent?: number; message?: string; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur')
      const msg = (json.sent ?? 0) === 0
        ? json.message ?? 'Aucun culte dans les 48 prochaines heures.'
        : `${json.sent} rappel${(json.sent ?? 0) > 1 ? 's' : ''} envoyé${(json.sent ?? 0) > 1 ? 's' : ''} !`
      setRappelMsg(msg)
      setRappelEtat('success')
    } catch (err) {
      setRappelMsg(err instanceof Error ? err.message : 'Erreur inconnue')
      setRappelEtat('error')
    }
    setTimeout(() => setRappelEtat('idle'), 6000)
  }

  const year        = moisAffiche.getFullYear()
  const month       = moisAffiche.getMonth()
  const cultesMois  = plannings.filter(p => {
    const d = new Date(p.date_culte + 'T00:00:00')
    return d.getFullYear() === year && d.getMonth() === month
  })
  const nbPlanifies = cultesMois.filter(p => !isPassee(p.date_culte)).length
  const moisLabel   = `${MOIS_NOMS[month]} ${year}`

  function handleClickDimanche(dateStr: string, culte?: PlanningCulte) {
    if (culte) {
      setCulteIdSel(culte.id); setDateSel(dateStr); setModalAssignOpen(true)
    } else {
      setDatePrefilled(dateStr); setModalAddOpen(true)
    }
  }

  function switchVue(v: Vue) {
    if (v === 'liste') {
      const d = new Date()
      setMoisAffiche(new Date(d.getFullYear(), d.getMonth(), 1))
    }
    setVue(v)
  }

  return (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Toggle vue */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(['liste', 'calendrier'] as Vue[]).map(v => (
              <button
                key={v}
                onClick={() => switchVue(v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all min-h-[36px]',
                  vue === v
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {v === 'liste'
                  ? <><List className="h-4 w-4" /> Liste</>
                  : <><CalendarDays className="h-4 w-4" /> Calendrier</>
                }
              </button>
            ))}
          </div>

          {/* Compteur */}
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{nbPlanifies}</span>{' '}
            culte{nbPlanifies !== 1 ? 's' : ''}{' '}en{' '}
            <span className="font-medium">{moisLabel}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 min-h-[44px]"
            onClick={envoyerRappels} disabled={rappelEtat === 'loading'}
            title="Rappels 48h par email">
            {rappelEtat === 'loading'
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Bell className="h-4 w-4" />
            }
            <span className="hidden sm:inline">Envoyer rappels</span>
          </Button>

          <Button size="sm" className="gap-1.5 min-h-[44px]"
            onClick={() => { setDatePrefilled(null); setModalAddOpen(true) }}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter un culte</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>
      </div>

      {/* Notification rappel */}
      {rappelEtat !== 'idle' && rappelEtat !== 'loading' && (
        <div className={cn(
          'flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium',
          rappelEtat === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200',
        )}>
          {rappelEtat === 'success'
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <AlertCircle className="h-4 w-4 shrink-0" />
          }
          {rappelMsg}
        </div>
      )}

      {/* Vue active */}
      {vue === 'liste' ? (
        <VueListe plannings={plannings} membres={membres} />
      ) : (
        <VueCalendrier
          plannings={plannings}
          membres={membres}
          moisAffiche={moisAffiche}
          onChangeMois={setMoisAffiche}
          onClickDimanche={handleClickDimanche}
        />
      )}

      <AjouterCulteModal open={modalAddOpen} onOpenChange={setModalAddOpen} datePrefilled={datePrefilled} />
      <CulteAssignModal
        open={modalAssignOpen}
        onOpenChange={setModalAssignOpen}
        culteId={culteIdSel}
        plannings={plannings}
        membres={membres}
        dateStr={dateSel}
      />
    </div>
  )
}
