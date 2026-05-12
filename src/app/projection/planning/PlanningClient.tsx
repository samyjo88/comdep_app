'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button }   from '@/components/ui/button'
import { Badge }    from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Plus, Mail, CalendarDays, Link as LinkIcon } from 'lucide-react'
import { capitalize, formatDateLong } from '@/lib/utils'
import {
  upsertPlanningAction,
  updatePlanningStatusAction,
  createCulteAction,
} from './actions'

export type PlanningEntry = {
  id:           string
  role_du_jour: string
  statut:       'planifie' | 'confirme' | 'present' | 'absent'
  notes:        string | null
  membres_projection: { id: string; prenom: string; nom: string } | null
}

export type SetlistInfo = {
  id:            string
  statut:        'brouillon' | 'valide' | 'utilise'
  titre_setlist: string | null
  setlist_items: { id: string }[]
}

export type CulteForPlanning = {
  id:                  string
  date_culte:          string
  theme:               string | null
  predicateur:         string | null
  statut:              string | null
  planning_projection: PlanningEntry[]
  setlists:            SetlistInfo[]
}

export type MembreBrief = {
  id:     string
  prenom: string
  nom:    string
  roles:  string[]
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const ROLES_PLANNING = [
  { value: 'diffusion', label: 'Diffusion' },
  { value: 'proclaim',  label: 'Proclaim' },
]

const STATUT_ORDER: PlanningEntry['statut'][] = ['planifie', 'confirme', 'present', 'absent']

const STATUT_BADGE: Record<PlanningEntry['statut'], { label: string; cls: string }> = {
  planifie: { label: 'Planifié', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  confirme: { label: 'Confirmé', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  present:  { label: 'Présent',  cls: 'bg-green-100 text-green-700 border-green-200' },
  absent:   { label: 'Absent',   cls: 'bg-red-100 text-red-700 border-red-200' },
}

function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

function toMoisParam(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function getCulteGlobalBadge(culte: CulteForPlanning): { label: string; cls: string } {
  const pp = culte.planning_projection
  let hasDiffusion = false
  let hasProclaim  = false
  let allPresent   = true
  let allCovered   = true

  for (const p of pp) {
    if (!p.membres_projection) { allCovered = false; allPresent = false; continue }
    if (p.role_du_jour === 'diffusion') hasDiffusion = true
    if (p.role_du_jour === 'proclaim')  hasProclaim  = true
    if (p.statut !== 'present')                         allPresent = false
    if (p.statut !== 'confirme' && p.statut !== 'present') allCovered = false
  }

  if (!hasDiffusion || !hasProclaim) {
    return { label: '⚠ Incomplet', cls: 'bg-red-100 text-red-700 border-red-200' }
  }
  if (allPresent)  return { label: '✓ Couvert', cls: 'bg-green-100 text-green-700 border-green-200' }
  if (allCovered)  return { label: 'Confirmé',  cls: 'bg-blue-100 text-blue-700 border-blue-200' }
  return { label: 'Planifié', cls: 'bg-gray-100 text-gray-700 border-gray-200' }
}

function getSetlistLink(culte: CulteForPlanning): {
  label: string; href: string; variant: 'ghost' | 'outline'
} | null {
  const sl = culte.setlists?.[0]
  if (!sl)                    return { label: 'Créer setlist', href: '/projection/setlists',              variant: 'ghost' }
  if (sl.statut === 'brouillon') return { label: 'Compléter',    href: `/projection/setlists/${sl.id}/edit`,   variant: 'outline' }
  return                             { label: 'Voir',            href: `/projection/setlists/${sl.id}/apercu`, variant: 'outline' }
}

function getEntryByRole(culte: CulteForPlanning, role: string): PlanningEntry | undefined {
  return culte.planning_projection.find(p => p.role_du_jour === role)
}

function CulteCard({
  culte,
  membres,
  onRappel,
}: {
  culte:    CulteForPlanning
  membres:  MembreBrief[]
  onRappel: (culteId: string) => void
}) {
  const [localCulte, setLocalCulte] = useState<CulteForPlanning>(culte)
  const [pending, startTransition]  = useTransition()

  const globalBadge = getCulteGlobalBadge(localCulte)
  const setlistLink = getSetlistLink(localCulte)

  function getEntry(role: string): PlanningEntry | undefined {
    return localCulte.planning_projection.find(p => p.role_du_jour === role)
  }

  function handleMemberChange(role: string, membreId: string) {
    const id   = membreId === '__none__' ? null : membreId
    const prev = localCulte

    setLocalCulte(lc => {
      const filtered = lc.planning_projection.filter(p => p.role_du_jour !== role)
      if (!id) return { ...lc, planning_projection: filtered }
      const membre   = membres.find(m => m.id === id) ?? null
      const existing = lc.planning_projection.find(p => p.role_du_jour === role)
      const updated: PlanningEntry = {
        id:                 existing?.id ?? '',
        role_du_jour:       role,
        statut:             existing?.statut ?? 'planifie',
        notes:              existing?.notes ?? null,
        membres_projection: membre ? { id: membre.id, prenom: membre.prenom, nom: membre.nom } : null,
      }
      return { ...lc, planning_projection: [...filtered, updated] }
    })

    startTransition(async () => {
      const res = await upsertPlanningAction({ culte_id: culte.id, role_du_jour: role, membre_id: id })
      if (res.error) { setLocalCulte(prev); alert(res.error) }
    })
  }

  function handleStatutClick(entry: PlanningEntry) {
    if (!entry.id) return
    const next = STATUT_ORDER[(STATUT_ORDER.indexOf(entry.statut) + 1) % STATUT_ORDER.length]
    const prev = localCulte

    setLocalCulte(lc => ({
      ...lc,
      planning_projection: lc.planning_projection.map(p =>
        p.id === entry.id ? { ...p, statut: next } : p
      ),
    }))

    startTransition(async () => {
      const res = await updatePlanningStatusAction(entry.id, next)
      if (res.error) { setLocalCulte(prev); alert(res.error) }
    })
  }

  const dateLabel = capitalize(formatDateLong(localCulte.date_culte))

  return (
    <Card className={pending ? 'opacity-75' : ''}>
      <CardHeader className="pb-2 flex flex-row items-start gap-3">
        <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm">{dateLabel}</span>
            <Badge variant="outline" className={`text-xs ${globalBadge.cls}`}>
              {globalBadge.label}
            </Badge>
          </div>
          {(localCulte.theme || localCulte.predicateur) && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {[localCulte.theme, localCulte.predicateur ? `Préd. ${localCulte.predicateur}` : null]
                .filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {setlistLink && (
            <>
              {/* Desktop: labeled button */}
              <Button asChild variant={setlistLink.variant} size="sm" className="h-7 text-xs gap-1 hidden sm:inline-flex">
                <Link href={setlistLink.href}>
                  <LinkIcon className="h-3 w-3" />
                  {setlistLink.label}
                </Link>
              </Button>
              {/* Mobile: icon only */}
              <Button asChild variant={setlistLink.variant} size="sm" className="h-8 w-8 p-0 sm:hidden">
                <Link href={setlistLink.href} title={setlistLink.label}>
                  <LinkIcon className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Envoyer rappel"
            onClick={() => onRappel(culte.id)}
          >
            <Mail className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {ROLES_PLANNING.map(role => {
          const entry     = getEntry(role.value)
          const membreId  = entry?.membres_projection?.id ?? '__none__'
          const statutCfg = entry?.statut ? STATUT_BADGE[entry.statut] : null

          return (
            <div key={role.value} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-xs font-medium text-muted-foreground sm:w-20 shrink-0">
                {role.label}
              </span>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Select value={membreId} onValueChange={v => handleMemberChange(role.value, v)}>
                  <SelectTrigger className="h-9 sm:h-8 text-xs flex-1 min-w-0">
                    <SelectValue placeholder="— Non assigné —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs text-muted-foreground">
                      — Non assigné —
                    </SelectItem>
                    {membres
                      .filter(m => m.roles?.includes(role.value))
                      .map(m => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.prenom} {m.nom}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {entry && entry.membres_projection && statutCfg ? (
                  <button
                    onClick={() => handleStatutClick(entry)}
                    className={`shrink-0 text-xs px-2 py-1 sm:py-0.5 rounded border font-medium cursor-pointer transition-opacity hover:opacity-70 ${statutCfg.cls}`}
                    title="Cliquer pour changer le statut"
                  >
                    {statutCfg.label}
                  </button>
                ) : (
                  <span className="shrink-0 w-20 hidden sm:block" />
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function AddCulteDialog({
  open,
  onClose,
  defaultYear,
  defaultMonth,
}: {
  open:         boolean
  onClose:      () => void
  defaultYear:  number
  defaultMonth: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [date,  setDate]  = useState(`${defaultYear}-${String(defaultMonth).padStart(2, '0')}-01`)
  const [theme, setTheme] = useState('')
  const [pred,  setPred]  = useState('')
  const [error, setError] = useState('')

  function handleSubmit() {
    if (!date) { setError('La date est requise.'); return }
    setError('')
    startTransition(async () => {
      const res = await createCulteAction({
        date_culte:  date,
        theme:       theme.trim() || null,
        predicateur: pred.trim()  || null,
      })
      if (res.error) { setError(res.error); return }
      router.refresh()
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajouter un culte</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="culte-date" className="text-sm">Date *</Label>
            <Input
              id="culte-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="culte-theme" className="text-sm">Thème</Label>
            <Input
              id="culte-theme"
              value={theme}
              onChange={e => setTheme(e.target.value)}
              placeholder="Thème du culte"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="culte-pred" className="text-sm">Prédicateur</Label>
            <Input
              id="culte-pred"
              value={pred}
              onChange={e => setPred(e.target.value)}
              placeholder="Nom du prédicateur"
              className="text-sm"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={pending || !date}>
            {pending ? 'Création…' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RappelDialog({
  culteId,
  onClose,
}: {
  culteId: string | null
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const [error,  setError]  = useState<string | null>(null)

  function handleSend() {
    if (!culteId) return
    setResult(null); setError(null)
    startTransition(async () => {
      try {
        const res  = await fetch('/api/projection/rappel', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ culte_id: culteId }),
        })
        const json = await res.json()
        if (!res.ok) { setError(json.error ?? 'Erreur inconnue'); return }
        setResult(`${json.sent ?? 0} email(s) envoyé(s).`)
      } catch {
        setError('Erreur réseau.')
      }
    })
  }

  return (
    <Dialog open={!!culteId} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Envoyer un rappel</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Un email de rappel sera envoyé aux opérateurs assignés à ce culte
          (Diffusion &amp; Proclaim).
        </p>
        {result && <p className="text-sm text-green-700 font-medium">{result}</p>}
        {error  && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={pending}>
            Fermer
          </Button>
          {!result && (
            <Button size="sm" onClick={handleSend} disabled={pending} className="gap-1">
              <Mail className="h-4 w-4" />
              {pending ? 'Envoi…' : 'Envoyer'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PlanningClient({
  cultes,
  membres,
  year,
  month,
}: {
  cultes:  CulteForPlanning[]
  membres: MembreBrief[]
  year:    number
  month:   number
}) {
  const router = useRouter()
  const [showAddCulte,  setShowAddCulte]  = useState(false)
  const [rappelCulteId, setRappelCulteId] = useState<string | null>(null)

  const prev     = prevMonth(year, month)
  const next     = nextMonth(year, month)
  const nowYear  = new Date().getFullYear()
  const nowMonth = new Date().getMonth() + 1
  const isToday  = year === nowYear && month === nowMonth

  function navigate(y: number, m: number) {
    router.push(`/projection/planning?mois=${toMoisParam(y, m)}`)
  }

  const fullyCovered = cultes.filter(c =>
    getEntryByRole(c, 'diffusion')?.membres_projection &&
    getEntryByRole(c, 'proclaim')?.membres_projection
  ).length

  const mobilisedIds = new Set(
    cultes.flatMap(c =>
      c.planning_projection
        .map(p => p.membres_projection?.id)
        .filter(Boolean) as string[]
    )
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigate(prev.year, prev.month)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <h2 className="text-lg font-semibold min-w-[10rem] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </h2>

        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigate(next.year, next.month)}>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        {!isToday && (
          <Button variant="ghost" size="sm" onClick={() => navigate(nowYear, nowMonth)}>
            Aujourd&apos;hui
          </Button>
        )}

        <Button size="sm" className="gap-1" onClick={() => setShowAddCulte(true)}>
          <Plus className="h-4 w-4" />
          Ajouter un culte
        </Button>
      </div>

      {cultes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground text-sm">
          Aucun culte ce mois-ci.
        </div>
      ) : (
        <div className="space-y-3">
          {cultes.map(culte => (
            <CulteCard
              key={culte.id}
              culte={culte}
              membres={membres}
              onRappel={id => setRappelCulteId(id)}
            />
          ))}
        </div>
      )}

      {cultes.length > 0 && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          {fullyCovered}/{cultes.length} culte(s) entièrement assigné(s)
          &nbsp;·&nbsp;
          {mobilisedIds.size} opérateur(s) mobilisé(s)
        </p>
      )}

      <AddCulteDialog
        open={showAddCulte}
        onClose={() => setShowAddCulte(false)}
        defaultYear={year}
        defaultMonth={month}
      />

      <RappelDialog
        culteId={rappelCulteId}
        onClose={() => setRappelCulteId(null)}
      />
    </div>
  )
}
