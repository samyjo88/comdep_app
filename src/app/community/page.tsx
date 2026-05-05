import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle, ChevronRight, CalendarDays,
  TrendingUp, Clock, XCircle, CheckCircle2, Lightbulb,
} from 'lucide-react'
import { PLATEFORMES_BY_CODE, STATUTS_POST_BY_CODE } from '@/types/community'
import type { Plateforme, StatutPost } from '@/types/community'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tableau de bord' }

// ── Helpers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function lundiDeLaSemaine(d = new Date()): string {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  const lundi = new Date(d)
  lundi.setDate(d.getDate() + diff)
  return lundi.toISOString().slice(0, 10)
}

function dimancheDeLaSemaine(lundiStr: string): string {
  const d = new Date(lundiStr + 'T00:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
}

function formatDateRange(lundiStr: string): string {
  const lundi    = new Date(lundiStr + 'T00:00:00')
  const dimanche = new Date(lundiStr + 'T00:00:00')
  dimanche.setDate(lundi.getDate() + 6)

  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  const optsAvecAnnee: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }

  if (lundi.getMonth() === dimanche.getMonth()) {
    return `${lundi.getDate()} au ${dimanche.toLocaleDateString('fr-FR', optsAvecAnnee)}`
  }
  return `${lundi.toLocaleDateString('fr-FR', opts)} au ${dimanche.toLocaleDateString('fr-FR', optsAvecAnnee)}`
}

function formatHeure(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateCourte(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function isWithin24h(iso: string | null): boolean {
  if (!iso) return false
  const diff = new Date(iso).getTime() - Date.now()
  return diff >= 0 && diff <= 24 * 60 * 60 * 1000
}

// ── Données ───────────────────────────────────────────────────────────────────

async function getDashboardData() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = await createClient() as any
  const semaine = lundiDeLaSemaine()
  const dimanche = dimancheDeLaSemaine(semaine)
  const now = new Date().toISOString()
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const [planningRes, derniereIdeeRes, urgentsRes] = await Promise.all([
    db
      .from('planning_cm')
      .select('*, membres_cm(*)')
      .eq('semaine_debut', semaine)
      .maybeSingle(),
    db
      .from('idees_contenu')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('posts')
      .select('*')
      .gte('date_publication_prevue', now)
      .lte('date_publication_prevue', in24h)
      .neq('statut', 'publie')
      .order('date_publication_prevue', { ascending: true })
      .limit(3),
  ])

  const planning: Row | null = planningRes.data ?? null
  const planningId: string | null = planning?.id ?? null

  // Posts de la semaine
  let posts: Row[] = []
  if (planningId) {
    const postsRes = await db
      .from('posts')
      .select('*')
      .eq('semaine_planning_id', planningId)
    posts = postsRes.data ?? []
  } else {
    // Fallback: posts ayant date_publication_prevue dans la semaine même sans planning
    const fallbackRes = await db
      .from('posts')
      .select('*')
      .gte('date_publication_prevue', semaine + 'T00:00:00')
      .lte('date_publication_prevue', dimanche + 'T23:59:59')
    posts = fallbackRes.data ?? []
  }

  const total    = posts.length
  const publies  = posts.filter((p: Row) => p.statut === 'publie').length
  const annules  = posts.filter((p: Row) => p.statut === 'annule').length
  const enAttente = total - publies - annules

  const parPlateforme = posts.reduce<Record<string, number>>((acc, p: Row) => {
    acc[p.plateforme] = (acc[p.plateforme] ?? 0) + 1
    return acc
  }, {})

  return {
    semaine,
    planning,
    membre:         planning?.membres_cm ?? null,
    total,
    publies,
    annules,
    enAttente,
    parPlateforme,
    postsUrgents:   (urgentsRes.data ?? []) as Row[],
    derniereIdee:   derniereIdeeRes.data ?? null,
  }
}

// ── PageContent ───────────────────────────────────────────────────────────────

async function PageContent() {
  const d = await getDashboardData()
  const progression = d.total > 0 ? Math.round((d.publies / d.total) * 100) : 0

  const platesActives = Object.entries(d.parPlateforme) as [Plateforme, number][]

  return (
    <div className="space-y-6">

      {/* ── ZONE 1 : Semaine en cours ─────────────────────────────────────── */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                <CalendarDays className="h-3.5 w-3.5" />
                Semaine en cours
              </div>
              <h2 className="text-xl font-bold tracking-tight">
                Semaine du {formatDateRange(d.semaine)}
              </h2>
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0 self-start">
              <Link href="/community/planning">
                Gérer cette semaine <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>

          {/* CM responsable */}
          <div className="mt-4">
            {d.membre ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                  {d.membre.prenom[0]}{d.membre.nom[0]}
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">
                    {d.membre.prenom} {d.membre.nom}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(d.membre.specialites ?? []).slice(0, 3).map((s: string) => (
                      <Badge key={s} variant="outline" className="text-xs h-5 px-1.5">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span className="font-medium">Aucun CM assigné cette semaine</span>
              </div>
            )}
          </div>

          {/* Barre de progression */}
          <div className="mt-5 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Posts publiés</span>
              <span className="font-semibold tabular-nums">
                {d.publies} / {d.total}
                <span className="text-muted-foreground font-normal ml-1">({progression}%)</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progression}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── ZONE 2 : 4 cartes stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total prévu
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{d.total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">posts cette semaine</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-green-700 uppercase tracking-wide">
              Publiés
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-green-700">{d.publies}</p>
            <p className="text-xs text-green-600/80 mt-0.5">posts en ligne</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-amber-700 uppercase tracking-wide">
              En attente
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-amber-700">{d.enAttente}</p>
            <p className="text-xs text-amber-600/80 mt-0.5">à traiter</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-red-700 uppercase tracking-wide">
              Annulés
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-red-700">{d.annules}</p>
            <p className="text-xs text-red-600/80 mt-0.5">cette semaine</p>
          </CardContent>
        </Card>
      </div>

      {/* ── ZONE 3 : Répartition par plateforme ──────────────────────────── */}
      {platesActives.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Répartition par plateforme
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {platesActives.map(([code, nb]) => {
              const cfg = PLATEFORMES_BY_CODE[code]
              if (!cfg) return null
              return (
                <div
                  key={code}
                  className="flex flex-col items-center gap-2 rounded-xl border p-3 text-center"
                  style={{ borderColor: cfg.couleur + '40', background: cfg.couleurBg }}
                >
                  <span className="text-2xl leading-none">{cfg.icone}</span>
                  <span className="text-xs font-medium leading-tight" style={{ color: cfg.couleur }}>
                    {cfg.label}
                  </span>
                  <span className="text-2xl font-bold tabular-nums leading-none">{nb}</span>
                  <span className="text-[10px] text-muted-foreground">
                    post{nb > 1 ? 's' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ZONE 4 + 5 : Posts urgents & Dernière idée ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Posts urgents — 2/3 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Posts à publier dans les 24h
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs h-7 px-2">
              <Link href="/community/posts">
                Voir tous <ChevronRight className="h-3 w-3 ml-0.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {d.postsUrgents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucun post urgent dans les prochaines 24h.
              </p>
            ) : (
              <div className="divide-y">
                {d.postsUrgents.map((post: Row) => {
                  const plate = PLATEFORMES_BY_CODE[post.plateforme as Plateforme]
                  const statut = STATUTS_POST_BY_CODE[post.statut as StatutPost]
                  const urgent = isWithin24h(post.date_publication_prevue)
                  return (
                    <div key={post.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 text-lg leading-none"
                        style={{ background: plate?.couleurBg ?? '#f5f5f5' }}
                      >
                        {plate?.icone ?? '📄'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {post.titre ?? post.type_contenu ?? '—'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {plate && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1.5"
                              style={{ borderColor: plate.couleur + '60', color: plate.couleur }}
                            >
                              {plate.label}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {post.type_contenu}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <p className={`text-xs font-semibold tabular-nums ${urgent ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {formatHeure(post.date_publication_prevue)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDateCourte(post.date_publication_prevue)}
                        </p>
                        {statut && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1.5"
                            style={{ borderColor: statut.couleur + '60', color: statut.couleur }}
                          >
                            {statut.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dernière idée — 1/3 */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Dernière idée
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs h-7 px-2">
              <Link href="/community/idees">
                Toutes <ChevronRight className="h-3 w-3 ml-0.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {d.derniereIdee ? (
              <div className="space-y-3">
                <p className="font-semibold text-sm leading-snug">
                  {d.derniereIdee.titre}
                </p>
                {d.derniereIdee.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {d.derniereIdee.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(d.derniereIdee.plateforme ?? []).slice(0, 3).map((p: string) => {
                    const cfg = PLATEFORMES_BY_CODE[p as Plateforme]
                    return (
                      <Badge
                        key={p}
                        variant="outline"
                        className="text-[10px] h-4 px-1.5"
                        style={cfg ? { borderColor: cfg.couleur + '60', color: cfg.couleur } : {}}
                      >
                        {cfg ? cfg.icone + ' ' + cfg.label : p}
                      </Badge>
                    )
                  })}
                  <PrioriteBadge priorite={d.derniereIdee.priorite} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-6 text-center gap-2">
                <Lightbulb className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Aucune idée pour l&apos;instant</p>
                <Button asChild size="sm" variant="outline" className="mt-1">
                  <Link href="/community/idees">Ajouter une idée</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}

// ── Micro-composant priorité ──────────────────────────────────────────────────

function PrioriteBadge({ priorite }: { priorite: string }) {
  const MAP: Record<string, { label: string; className: string }> = {
    urgente: { label: '🔴 Urgente', className: 'border-red-300 text-red-700 bg-red-50' },
    haute:   { label: '🟠 Haute',   className: 'border-orange-300 text-orange-700 bg-orange-50' },
    normale: { label: '🟡 Normale', className: 'border-yellow-300 text-yellow-700 bg-yellow-50' },
    basse:   { label: '⚪ Basse',   className: 'border-slate-200 text-slate-500 bg-slate-50' },
  }
  const cfg = MAP[priorite] ?? MAP.normale
  return (
    <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${cfg.className}`}>
      {cfg.label}
    </Badge>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-44 rounded-xl bg-muted" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl bg-muted" />)}
      </div>
      <div className="h-24 rounded-xl bg-muted" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-52 rounded-xl bg-muted" />
        <div className="h-52 rounded-xl bg-muted" />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Vue d&apos;ensemble du Community Management
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
