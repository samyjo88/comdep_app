'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Volume2, Monitor, Video, Share2, Megaphone,
  CalendarDays, LayoutGrid, ArrowLeftRight, Users, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DEPARTEMENTS, DEPARTEMENTS_CONFIG,
  type AssignationDimanche, type Departement,
  type MembresParDepartement, type Slot,
} from '@/types/planning-dimanche'
import { assignerMembre, permuterAssignation } from '@/app/dashboard/planning-dimanche/actions'

// ── Config ─────────────────────────────────────────────────────────────────

const DEPT_ICON: Record<Departement, typeof Volume2> = {
  son:        Volume2,
  projection: Monitor,
  captation:  Video,
  community:  Share2,
  annonces:   Megaphone,
}

const SLOTS: Slot[] = [1, 2]

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateLongue(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDateCourte(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function cle(date: string, dept: Departement, slot: Slot): string {
  return `${date}|${dept}|${slot}`
}

// ── Cellule : sélecteur de membre + bouton permutation ─────────────────────

interface CelluleMembreProps {
  date:     string
  dept:     Departement
  slot:     Slot
  parCle:   Map<string, AssignationDimanche>
  membres:  MembresParDepartement
  disabled: boolean
  onAssign: (date: string, dept: Departement, slot: Slot, membreId: string | null) => void
  onSwap:   (a: AssignationDimanche) => void
}

function CelluleMembre({ date, dept, slot, parCle, membres, disabled, onAssign, onSwap }: CelluleMembreProps) {
  const assignation = parCle.get(cle(date, dept, slot))
  const options     = membres[dept].filter(m => m.actif || m.id === assignation?.membre_id)
  const valeur      = assignation?.membre_id ?? 'none'

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Select
        value={valeur}
        onValueChange={v => onAssign(date, dept, slot, v === 'none' ? null : v)}
        disabled={disabled}
      >
        <SelectTrigger className={cn(
          'h-8 text-xs border shadow-none focus:ring-0 focus:ring-offset-0 flex-1 min-w-0',
          valeur === 'none' ? 'text-muted-foreground border-dashed' : 'bg-background',
        )}>
          <SelectValue placeholder="Non assigné" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— Non assigné —</SelectItem>
          {options.map(m => (
            <SelectItem key={m.id} value={m.id}>
              {m.prenom} {m.nom}
            </SelectItem>
          ))}
          {options.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Aucun membre dans ce département
            </div>
          )}
        </SelectContent>
      </Select>
      {assignation && assignation.id > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-foreground"
          title="Permuter cette place"
          disabled={disabled}
          onClick={() => onSwap(assignation)}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

// ── Vue par dimanche ───────────────────────────────────────────────────────

interface VueProps {
  dimanches: string[]
  parCle:    Map<string, AssignationDimanche>
  membres:   MembresParDepartement
  disabled:  boolean
  onAssign:  CelluleMembreProps['onAssign']
  onSwap:    CelluleMembreProps['onSwap']
}

function VueParDimanche({ dimanches, parCle, membres, disabled, onAssign, onSwap }: VueProps) {
  return (
    <div className="space-y-4">
      {dimanches.map(date => {
        const nbCouverts = DEPARTEMENTS.filter(d => parCle.has(cle(date, d, 1))).length
        const complet    = nbCouverts === DEPARTEMENTS.length
        return (
          <Card key={date}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {capitalize(formatDateLongue(date))}
                </CardTitle>
                <Badge variant="outline" className={cn(
                  'text-xs gap-1',
                  complet
                    ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'text-muted-foreground',
                )}>
                  {complet && <CheckCircle2 className="h-3 w-3" />}
                  {nbCouverts}/{DEPARTEMENTS.length} départements
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {DEPARTEMENTS.map(dept => {
                const cfg  = DEPARTEMENTS_CONFIG[dept]
                const Icon = DEPT_ICON[dept]
                return (
                  <div key={dept} className="grid grid-cols-1 sm:grid-cols-[10rem_1fr_1fr] gap-2 items-center py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={cn('flex items-center justify-center w-7 h-7 rounded-lg shrink-0', cfg.bg)}>
                        <Icon className={cn('h-3.5 w-3.5', cfg.couleur)} />
                      </div>
                      <span className="text-xs font-medium">{cfg.label}</span>
                    </div>
                    <CelluleMembre
                      date={date} dept={dept} slot={1}
                      parCle={parCle} membres={membres} disabled={disabled}
                      onAssign={onAssign} onSwap={onSwap}
                    />
                    <CelluleMembre
                      date={date} dept={dept} slot={2}
                      parCle={parCle} membres={membres} disabled={disabled}
                      onAssign={onAssign} onSwap={onSwap}
                    />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ── Vue par département ────────────────────────────────────────────────────

interface VueParDepartementProps extends VueProps {
  deptActif:    Departement
  onDeptChange: (dept: Departement) => void
}

function VueParDepartement({
  dimanches, parCle, membres, disabled, onAssign, onSwap, deptActif, onDeptChange,
}: VueParDepartementProps) {
  const cfg = DEPARTEMENTS_CONFIG[deptActif]
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {DEPARTEMENTS.map(dept => {
          const dCfg  = DEPARTEMENTS_CONFIG[dept]
          const Icon  = DEPT_ICON[dept]
          const actif = dept === deptActif
          return (
            <Button
              key={dept}
              variant={actif ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => onDeptChange(dept)}
            >
              <Icon className={cn('h-3.5 w-3.5', !actif && dCfg.couleur)} />
              {dCfg.label}
            </Button>
          )
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className={cn('h-4 w-4', cfg.couleur)} />
            Planning {cfg.label} — {dimanches.length} prochains dimanches
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-40">Dimanche</TableHead>
                <TableHead className="text-xs">Membre 1</TableHead>
                <TableHead className="text-xs">Membre 2</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dimanches.map(date => (
                <TableRow key={date}>
                  <TableCell className="text-xs font-medium whitespace-nowrap">
                    {capitalize(formatDateCourte(date))}
                  </TableCell>
                  <TableCell className="min-w-44">
                    <CelluleMembre
                      date={date} dept={deptActif} slot={1}
                      parCle={parCle} membres={membres} disabled={disabled}
                      onAssign={onAssign} onSwap={onSwap}
                    />
                  </TableCell>
                  <TableCell className="min-w-44">
                    <CelluleMembre
                      date={date} dept={deptActif} slot={2}
                      parCle={parCle} membres={membres} disabled={disabled}
                      onAssign={onAssign} onSwap={onSwap}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────

interface Props {
  dimanches:           string[]
  initialAssignations: AssignationDimanche[]
  membres:             MembresParDepartement
}

export function PlanningDimancheClient({ dimanches, initialAssignations, membres }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [assignations, setAssignations] = useState<AssignationDimanche[]>(initialAssignations)
  // Resynchronise l'état local quand le serveur renvoie de nouvelles données
  // (pattern « adjust state during render », recommandé par React)
  const [prevInitial, setPrevInitial] = useState(initialAssignations)
  if (prevInitial !== initialAssignations) {
    setPrevInitial(initialAssignations)
    setAssignations(initialAssignations)
  }

  const [vue,       setVue]       = useState<'dimanche' | 'departement'>('dimanche')
  const [deptActif, setDeptActif] = useState<Departement>('son')

  // Permutation : assignation source sélectionnée + cible choisie dans le dialog
  const [swapSource, setSwapSource] = useState<AssignationDimanche | null>(null)
  const [swapDate,   setSwapDate]   = useState<string>('')
  const [swapSlot,   setSwapSlot]   = useState<Slot>(1)

  const parCle = useMemo(() => {
    const map = new Map<string, AssignationDimanche>()
    for (const a of assignations) map.set(cle(a.date_dimanche, a.departement, a.slot), a)
    return map
  }, [assignations])

  const nomMembre = useMemo(() => {
    const maps = {} as Record<Departement, Map<string, string>>
    for (const dept of DEPARTEMENTS) {
      maps[dept] = new Map(membres[dept].map(m => [m.id, `${m.prenom} ${m.nom}`]))
    }
    return (dept: Departement, membreId: string): string =>
      maps[dept].get(membreId) ?? 'Membre inconnu'
  }, [membres])

  // ── Actions ──────────────────────────────────────────────────────────────

  function handleAssign(date: string, dept: Departement, slot: Slot, membreId: string | null) {
    // Mise à jour optimiste (id temporaire négatif pour les nouvelles lignes)
    setAssignations(prev => {
      const sans = prev.filter(a => !(a.date_dimanche === date && a.departement === dept && a.slot === slot))
      if (!membreId) return sans
      const existante = prev.find(a => a.date_dimanche === date && a.departement === dept && a.slot === slot)
      return [...sans, {
        id: existante?.id ?? -Date.now(),
        date_dimanche: date, departement: dept, slot, membre_id: membreId,
      }]
    })
    startTransition(async () => {
      const res = await assignerMembre(date, dept, slot, membreId)
      if (!res.success) toast.error(res.error)
      router.refresh()
    })
  }

  function ouvrirSwap(a: AssignationDimanche) {
    setSwapSource(a)
    const autre = dimanches.find(d => d !== a.date_dimanche) ?? a.date_dimanche
    setSwapDate(autre)
    setSwapSlot(a.slot)
  }

  function confirmerSwap() {
    if (!swapSource) return
    const source = swapSource
    setSwapSource(null)
    startTransition(async () => {
      const res = await permuterAssignation(source.id, swapDate, swapSlot)
      if (res.success) toast.success('Permutation effectuée')
      else toast.error(res.error)
      router.refresh()
    })
  }

  // ── Rendu ────────────────────────────────────────────────────────────────

  const vueProps: VueProps = {
    dimanches, parCle, membres,
    disabled: isPending,
    onAssign: handleAssign,
    onSwap:   ouvrirSwap,
  }

  const swapCible     = swapSource ? parCle.get(cle(swapDate, swapSource.departement, swapSlot)) : undefined
  const swapMemePlace = swapSource != null && swapDate === swapSource.date_dimanche && swapSlot === swapSource.slot

  return (
    <div className="space-y-5">
      {/* Bascule de vue */}
      <div className="flex gap-2">
        <Button
          variant={vue === 'dimanche' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs h-8"
          onClick={() => setVue('dimanche')}
        >
          <CalendarDays className="h-3.5 w-3.5" /> Par dimanche
        </Button>
        <Button
          variant={vue === 'departement' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs h-8"
          onClick={() => setVue('departement')}
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Par département
        </Button>
      </div>

      {vue === 'dimanche'
        ? <VueParDimanche {...vueProps} />
        : <VueParDepartement {...vueProps} deptActif={deptActif} onDeptChange={setDeptActif} />}

      {/* Dialog permutation */}
      <Dialog open={swapSource != null} onOpenChange={open => { if (!open) setSwapSource(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" /> Permuter une place
            </DialogTitle>
            {swapSource && (
              <DialogDescription>
                {nomMembre(swapSource.departement, swapSource.membre_id)} —{' '}
                {DEPARTEMENTS_CONFIG[swapSource.departement].label}, place {swapSource.slot},{' '}
                {capitalize(formatDateCourte(swapSource.date_dimanche))}.
                Choisissez la place avec laquelle échanger (même département).
              </DialogDescription>
            )}
          </DialogHeader>

          {swapSource && (
            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label className="text-xs">Dimanche cible</Label>
                <Select value={swapDate} onValueChange={setSwapDate}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dimanches.map(d => (
                      <SelectItem key={d} value={d}>
                        {capitalize(formatDateCourte(d))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Place cible</Label>
                <Select value={String(swapSlot)} onValueChange={v => setSwapSlot(Number(v) as Slot)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLOTS.map(s => (
                      <SelectItem key={s} value={String(s)}>Membre {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={cn(
                'rounded-lg border px-3 py-2 text-xs',
                swapCible ? 'bg-muted/50' : 'border-dashed text-muted-foreground',
              )}>
                {swapMemePlace
                  ? 'La place cible est identique à la place actuelle.'
                  : swapCible
                  ? <>Échange avec <span className="font-medium">{nomMembre(swapSource.departement, swapCible.membre_id)}</span></>
                  : 'Place cible libre : la personne y sera simplement déplacée.'}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSwapSource(null)}>
              Annuler
            </Button>
            <Button size="sm" onClick={confirmerSwap} disabled={isPending || swapMemePlace}>
              <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
              {swapCible ? 'Échanger' : 'Déplacer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
