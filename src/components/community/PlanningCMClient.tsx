'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, CalendarDays, List,
  Loader2, UserX,
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { Badge }    from '@/components/ui/badge'
import { Button }   from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
  assignerMembreAction,
  updateStatutAction,
  updateNotesAction,
  updateChecklistAction,
} from '@/app/community/planning/actions'

import type { MembreCM, PlanningCM, Post, StatutPlanning } from '@/types/community'
import { PLATEFORMES_BY_CODE } from '@/types/community'
import type { MonthWeekEntry } from '@/app/community/planning/page'

// ── Constantes ────────────────────────────────────────────────────────────────

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const CHECKLIST_ITEMS = [
  { id: 'annonce_facebook',   label: 'Post annonce culte (Facebook)',    icone: '📘' },
  { id: 'story_rappel',       label: 'Story de rappel culte (Facebook)', icone: '📸' },
  { id: 'programme_whatsapp', label: 'Diffusion programme WhatsApp',     icone: '💬' },
  { id: 'recap_post_culte',   label: 'Post récapitulatif post-culte',    icone: '✅' },
  { id: 'reel_tiktok',        label: 'Reel / TikTok de la semaine',      icone: '🎵' },
]

const STATUT_CONFIG: Record<StatutPlanning, { label: string; className: string }> = {
  planifie: { label: 'Planifié', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  confirme: { label: 'Confirmé', className: 'bg-green-100 text-green-700 border-green-200' },
  termine:  { label: 'Terminé',  className: 'bg-gray-100 text-gray-500 border-gray-200' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addWeeks(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + 7 * n)
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function lundiCourant(): string {
  const d = new Date()
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return d.toISOString().slice(0, 10)
}

/** Lundi de la semaine contenant le 7 du mois → toujours dans ce mois */
function lundiPourMois(annee: number, mois: number): string {
  const d = new Date(annee, mois - 1, 7)
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return d.toISOString().slice(0, 10)
}

function formatDateRange(lundiStr: string): string {
  const lundi = new Date(lundiStr + 'T00:00:00')
  const dim   = new Date(lundiStr + 'T00:00:00')
  dim.setDate(lundi.getDate() + 6)

  const opts:     Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  const optsFull: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }

  if (lundi.getMonth() === dim.getMonth()) {
    return `${lundi.getDate()} au ${dim.toLocaleDateString('fr-FR', optsFull)}`
  }
  return `${lundi.toLocaleDateString('fr-FR', opts)} au ${dim.toLocaleDateString('fr-FR', optsFull)}`
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  semaine:        string
  vue:            'semaine' | 'mois'
  planning:       PlanningCM | null
  membre:         MembreCM | null
  posts:          Post[]
  membres:        MembreCM[]
  annee:          number
  mois:           number
  semainesDuMois: string[]
  planningsMap:   Record<string, MonthWeekEntry>
}

// ── Composant principal ───────────────────────────────────────────────────────

export function PlanningCMClient({
  semaine,
  vue,
  planning,
  membre,
  posts,
  membres,
  annee,
  mois,
  semainesDuMois,
  planningsMap,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // État local — réinitialisé à chaque changement de semaine
  const [notes, setNotes] = useState(planning?.notes ?? '')
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (planning?.notes_json as any)?.checklist ?? {},
  )
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setNotes(planning?.notes ?? '')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setChecklist((planning?.notes_json as any)?.checklist ?? {})
  }, [semaine]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ────────────────────────────────────────────────────────────

  function navTo(newSemaine: string, newVue = vue) {
    const p = new URLSearchParams({ semaine: newSemaine })
    if (newVue !== 'semaine') p.set('vue', newVue)
    router.push('/community/planning?' + p.toString())
  }

  function handlePrev() {
    if (vue === 'mois') {
      const m = mois === 1 ? 12 : mois - 1
      const a = mois === 1 ? annee - 1 : annee
      navTo(lundiPourMois(a, m), 'mois')
    } else {
      navTo(addWeeks(semaine, -1))
    }
  }

  function handleNext() {
    if (vue === 'mois') {
      const m = mois === 12 ? 1 : mois + 1
      const a = mois === 12 ? annee + 1 : annee
      navTo(lundiPourMois(a, m), 'mois')
    } else {
      navTo(addWeeks(semaine, 1))
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  function handleAssignerMembre(value: string) {
    startTransition(async () => {
      await assignerMembreAction(semaine, value === '__none__' ? null : value)
    })
  }

  function handleStatutChange(statut: StatutPlanning) {
    startTransition(async () => {
      await updateStatutAction(semaine, statut)
    })
  }

  function handleNotesChange(value: string) {
    setNotes(value)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => {
      startTransition(async () => { await updateNotesAction(semaine, value) })
    }, 1000)
  }

  function handleChecklistChange(itemId: string, checked: boolean) {
    const next = { ...checklist, [itemId]: checked }
    setChecklist(next)
    startTransition(async () => { await updateChecklistAction(semaine, next) })
  }

  // ── Données dérivées ──────────────────────────────────────────────────────

  const today = new Date().toISOString().slice(0, 10)
  const isCurrentWeek = semaine === lundiCourant()
  const statut = (planning?.statut as StatutPlanning) ?? 'planifie'
  const statutCfg = STATUT_CONFIG[statut]
  const checklistDone = CHECKLIST_ITEMS.filter(i => checklist[i.id]).length

  const postsByDay = posts.reduce<Record<string, Post[]>>((acc, p) => {
    const day = p.date_publication_prevue?.slice(0, 10)
    if (day) (acc[day] ??= []).push(p)
    return acc
  }, {})

  // ── En-tête partagé ───────────────────────────────────────────────────────

  const header = (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <div className="flex items-center gap-1">
        <Button
          variant="outline" size="icon" className="h-9 w-9"
          onClick={handlePrev} disabled={isPending}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="min-w-[230px] text-center px-1">
          {vue === 'semaine' ? (
            <p className="text-sm font-semibold leading-tight">
              Semaine du {formatDateRange(semaine)}
            </p>
          ) : (
            <p className="text-sm font-semibold">{MOIS_NOMS[mois - 1]} {annee}</p>
          )}
        </div>

        <Button
          variant="outline" size="icon" className="h-9 w-9"
          onClick={handleNext} disabled={isPending}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button variant="ghost" size="sm" onClick={() => navTo(lundiCourant())} disabled={isPending}>
        Aujourd&apos;hui
      </Button>

      <div className="ml-auto flex items-center gap-2">
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Button
          variant={vue === 'mois' ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
          onClick={() => navTo(semaine, vue === 'semaine' ? 'mois' : 'semaine')}
          disabled={isPending}
        >
          {vue === 'mois'
            ? <><List className="h-4 w-4" /> Vue semaine</>
            : <><CalendarDays className="h-4 w-4" /> Vue mensuelle</>}
        </Button>
      </div>
    </div>
  )

  // ── Vue mensuelle ─────────────────────────────────────────────────────────

  if (vue === 'mois') {
    return (
      <div>
        {header}
        <Card>
          <div className="divide-y">
            {semainesDuMois.map(sem => {
              const entry       = planningsMap[sem]
              const semLundi    = sem === lundiCourant()
              const semVide     = !entry?.planning
              const dim         = addDays(sem, 6)
              const formatShort = (s: string) =>
                new Date(s + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

              return (
                <button
                  key={sem}
                  className={cn(
                    'w-full flex items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40',
                    semLundi && 'bg-primary/5',
                    semVide  && 'bg-red-50/50 hover:bg-red-50/80',
                  )}
                  onClick={() => navTo(sem, 'semaine')}
                >
                  {/* Dates */}
                  <div className="w-28 shrink-0">
                    <p className="text-sm font-medium">{formatShort(sem)}</p>
                    <p className="text-xs text-muted-foreground">au {formatShort(dim)}</p>
                  </div>

                  {/* Membre */}
                  <div className="flex-1 min-w-0">
                    {entry?.membre ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {entry.membre.prenom[0]}{entry.membre.nom[0]}
                        </div>
                        <span className="text-sm font-medium truncate">
                          {entry.membre.prenom} {entry.membre.nom}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-red-600">
                        <UserX className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">Aucun CM assigné</span>
                      </div>
                    )}
                  </div>

                  {/* Méta */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {entry?.nbPosts ?? 0} post{(entry?.nbPosts ?? 0) !== 1 ? 's' : ''}
                    </span>
                    {entry?.planning && (
                      <Badge
                        variant="outline"
                        className={cn('text-xs', STATUT_CONFIG[entry.planning.statut as StatutPlanning]?.className)}
                      >
                        {STATUT_CONFIG[entry.planning.statut as StatutPlanning]?.label}
                      </Badge>
                    )}
                    {semLundi && (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                        Cette semaine
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              )
            })}
          </div>
        </Card>
      </div>
    )
  }

  // ── Vue semaine ───────────────────────────────────────────────────────────

  return (
    <div>
      {header}

      {isCurrentWeek && (
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-primary" />
          Semaine actuelle
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-6">

          {/* ── SECTION A : Responsable CM ────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Responsable de la semaine
            </h3>

            {membre ? (
              <div className="flex flex-wrap items-start gap-4">
                {/* Avatar + infos */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-base shrink-0">
                    {membre.prenom[0]}{membre.nom[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-base leading-tight">
                      {membre.prenom} {membre.nom}
                    </p>
                    {membre.email && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{membre.email}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(membre.specialites ?? []).map((s: string) => (
                        <Badge key={s} variant="outline" className="text-xs h-5 px-1.5 capitalize">
                          {s}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(membre.plateformes ?? []).map((p: string) => {
                        const cfg = PLATEFORMES_BY_CODE[p as keyof typeof PLATEFORMES_BY_CODE]
                        return (
                          <Badge
                            key={p}
                            variant="outline"
                            className="text-xs h-5 px-1.5"
                            style={cfg ? { borderColor: cfg.couleur + '50', color: cfg.couleur } : {}}
                          >
                            {cfg?.icone} {cfg?.label ?? p}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Contrôles : statut + changer membre */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={isPending}>
                      <Badge
                        variant="outline"
                        className={cn(
                          'cursor-pointer select-none hover:opacity-80 transition-opacity gap-1',
                          statutCfg.className,
                        )}
                      >
                        {statutCfg.label}
                        <span className="text-[10px] opacity-60">▾</span>
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {(Object.entries(STATUT_CONFIG) as [StatutPlanning, typeof statutCfg][]).map(
                        ([code, cfg]) => (
                          <DropdownMenuItem
                            key={code}
                            onClick={() => handleStatutChange(code)}
                            className={cn(code === statut && 'font-medium')}
                          >
                            <Badge variant="outline" className={cn('mr-2 text-xs', cfg.className)}>
                              {cfg.label}
                            </Badge>
                          </DropdownMenuItem>
                        ),
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Select onValueChange={handleAssignerMembre} disabled={isPending}>
                    <SelectTrigger className="h-8 text-xs w-[150px]">
                      <SelectValue placeholder="Changer le CM…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Retirer le CM —</SelectItem>
                      {membres
                        .filter(m => m.id !== membre.id)
                        .map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.prenom} {m.nom}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              /* Zone pointillée si non assigné */
              <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-muted p-8">
                <UserX className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground font-medium">
                  Aucun CM assigné pour cette semaine
                </p>
                <Select onValueChange={handleAssignerMembre} disabled={isPending}>
                  <SelectTrigger className="h-9 text-sm w-[220px]">
                    <SelectValue placeholder="+ Assigner un CM…" />
                  </SelectTrigger>
                  <SelectContent>
                    {membres.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Aucun membre actif
                      </div>
                    ) : (
                      membres.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="font-medium">{m.prenom} {m.nom}</span>
                          {m.specialites?.length > 0 && (
                            <span className="text-muted-foreground ml-1.5 text-xs">
                              · {m.specialites.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes de la semaine */}
            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Notes de la semaine
                {isPending && (
                  <span className="ml-2 text-[10px] text-muted-foreground/60 italic">
                    Sauvegarde…
                  </span>
                )}
              </label>
              <Textarea
                value={notes}
                onChange={e => handleNotesChange(e.target.value)}
                placeholder="Contexte, contraintes, informations importantes pour cette semaine…"
                className="text-sm resize-none min-h-[72px]"
                disabled={isPending}
              />
            </div>
          </section>

          <div className="border-t" />

          {/* ── SECTION B : Grille 7 jours ──────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Posts de la semaine
              </h3>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7 px-2">
                <Link href="/community/posts">
                  Gérer les posts →
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {JOURS_COURTS.map((jour, i) => {
                const dayStr   = addDays(semaine, i)
                const dayPosts = postsByDay[dayStr] ?? []
                const publies  = dayPosts.filter(p => p.statut === 'publie').length
                const hasLate  = dayPosts.some(p => p.statut !== 'publie' && dayStr < today)
                const isToday  = dayStr === today
                const isPast   = dayStr < today
                const total    = dayPosts.length

                return (
                  <Link
                    key={dayStr}
                    href={`/community/posts?date=${dayStr}`}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl p-2 text-center transition-colors hover:bg-muted/50',
                      isToday && 'bg-primary/5 ring-1 ring-primary/20',
                      isPast && !isToday && 'opacity-55',
                    )}
                  >
                    <span className={cn(
                      'text-xs font-semibold',
                      isToday && 'text-primary',
                    )}>
                      {jour}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-none">
                      {new Date(dayStr + 'T00:00:00').getDate()}
                    </span>
                    <div className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold',
                      total === 0
                        ? 'bg-muted/60 text-muted-foreground'
                        : publies === total
                        ? 'bg-green-100 text-green-700'
                        : 'bg-primary/10 text-primary',
                    )}>
                      {total}
                    </div>
                    {hasLate && (
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Post(s) en retard" />
                    )}
                  </Link>
                )
              })}
            </div>
          </section>

          <div className="border-t" />

          {/* ── SECTION C : Checklist ────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Checklist CM
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {checklistDone} / {CHECKLIST_ITEMS.length} tâches
              </span>
            </div>

            {/* Barre de progression checklist */}
            <div className="h-1.5 rounded-full bg-muted mb-4 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${(checklistDone / CHECKLIST_ITEMS.length) * 100}%` }}
              />
            </div>

            <div className="space-y-2">
              {CHECKLIST_ITEMS.map(item => {
                const checked = !!checklist[item.id]
                return (
                  <label
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/30',
                      checked && 'bg-green-50/60 border-green-200/80',
                      isPending && 'pointer-events-none',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 accent-green-600 cursor-pointer shrink-0"
                      checked={checked}
                      onChange={e => handleChecklistChange(item.id, e.target.checked)}
                      disabled={isPending}
                    />
                    <span className="text-lg leading-none shrink-0">{item.icone}</span>
                    <span className={cn(
                      'text-sm flex-1',
                      checked && 'line-through text-muted-foreground',
                    )}>
                      {item.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </section>

        </CardContent>
      </Card>
    </div>
  )
}
