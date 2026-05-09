import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RechercheRapide } from './RechercheRapide'
import {
  CalendarDays, Music, Users, CheckCircle2, AlertCircle,
  ChevronRight, Monitor, Keyboard, List, Star,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tableau de bord' }

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateLongue(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function debutDeMois(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function nomMois(): string {
  return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function statutSetlistLabel(statut: string): string {
  if (statut === 'valide' || statut === 'utilise') return 'Prête'
  return 'Brouillon'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

// ── getDashboardData ───────────────────────────────────────────────────────

async function getDashboardData() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const today    = new Date().toISOString().slice(0, 10)

  const [
    prochainRes,
    gadTotalRes,
    gadActifRes,
    choraleRes,
    setlistsMoisRes,
    plusUtiliseRes,
    dernieresSetlistsRes,
  ] = await Promise.all([
    supabase.from('cultes')
      .select('id, date_culte, theme, predicateur')
      .gte('date_culte', today)
      .order('date_culte', { ascending: true })
      .limit(1),
    supabase.from('cantiques')
      .select('id', { count: 'exact', head: true })
      .eq('categorie', 'gad'),
    supabase.from('cantiques')
      .select('id', { count: 'exact', head: true })
      .eq('categorie', 'gad')
      .eq('actif', true),
    supabase.from('cantiques')
      .select('id', { count: 'exact', head: true })
      .eq('categorie', 'chorale'),
    supabase.from('setlists')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', debutDeMois()),
    supabase.from('cantiques')
      .select('id, titre, nb_utilisations')
      .gt('nb_utilisations', 0)
      .order('nb_utilisations', { ascending: false })
      .limit(1),
    supabase.from('setlists')
      .select('id, statut, titre_setlist, culte_id, cultes(date_culte), setlist_items(id)')
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  const prochainCulte: Row | null = prochainRes.data?.[0] ?? null

  let prochainSetlist: Row | null = null
  let prochainAssignments: Row[]  = []

  if (prochainCulte) {
    const [setlistRes, planningRes] = await Promise.all([
      supabase.from('setlists')
        .select('id, statut, setlist_items(id)')
        .eq('culte_id', prochainCulte.id)
        .maybeSingle(),
      supabase.from('planning_projection')
        .select('role_du_jour, statut, membres_projection(prenom, nom)')
        .eq('culte_id', prochainCulte.id),
    ])
    prochainSetlist    = setlistRes.data ?? null
    prochainAssignments = planningRes.data ?? []
  }

  return {
    prochainCulte,
    prochainSetlist,
    prochainAssignments,
    gadTotal:          gadTotalRes.count   ?? 0,
    gadActif:          gadActifRes.count   ?? 0,
    choraleTotal:      choraleRes.count    ?? 0,
    setlistsMois:      setlistsMoisRes.count ?? 0,
    plusUtilise:       (plusUtiliseRes.data ?? [])[0] as Row | null,
    dernieresSetlists: (dernieresSetlistsRes.data ?? []) as Row[],
    mois:              nomMois(),
  }
}

// ── StatCard ───────────────────────────────────────────────────────────────

function StatCard({
  titre, valeur, sous_titre, icone: Icon, couleur,
}: {
  titre:      string
  valeur:     string | number
  sous_titre: string
  icone:      typeof Music
  couleur:    'blue' | 'amber' | 'violet' | 'emerald'
}) {
  const bg: Record<typeof couleur, string> = {
    blue:    'bg-blue-50 text-blue-600',
    amber:   'bg-amber-50 text-amber-600',
    violet:  'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titre}</CardTitle>
        <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${bg[couleur]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold tabular-nums">{valeur}</p>
        <p className="text-xs text-muted-foreground mt-1">{sous_titre}</p>
      </CardContent>
    </Card>
  )
}

// ── ProchainCulteCard ──────────────────────────────────────────────────────

function ProchainCulteCard({
  culte,
  setlist,
  assignments,
}: {
  culte:       Row
  setlist:     Row | null
  assignments: Row[]
}) {
  const setlistPrete = setlist?.statut === 'valide' || setlist?.statut === 'utilise'
  const nbCantiques  = Array.isArray(setlist?.setlist_items) ? setlist.setlist_items.length : 0

  const diffusion = assignments.find((a: Row) => a.role_du_jour === 'operateur_diffusion')
  const proclaim  = assignments.find((a: Row) => a.role_du_jour === 'operateur_proclaim')

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
              <CalendarDays className="h-4 w-4" />
              Prochain culte
            </CardTitle>
            <p className="text-xl font-bold">
              {capitalize(formatDateLongue(culte.date_culte))}
            </p>
            {culte.theme && (
              <p className="text-sm text-muted-foreground mt-0.5">{culte.theme}</p>
            )}
          </div>
          <Link href={`/projection/setlists?culte=${culte.id}`}>
            <Button size="sm" className="shrink-0 gap-1 text-xs">
              Préparer ce culte
              <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Setlist */}
        <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted shrink-0">
              <List className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Setlist</p>
              {setlist ? (
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {setlistPrete ? (
                    <Badge className="text-[11px] px-1.5 py-0 h-5 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Prête · {nbCantiques} cantique{nbCantiques > 1 ? 's' : ''}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 bg-amber-50 text-amber-700 border-amber-200 gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Brouillon · {nbCantiques} cantique{nbCantiques > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              ) : (
                <Badge variant="outline" className="mt-0.5 text-[11px] px-1.5 py-0 h-5 bg-orange-50 text-orange-700 border-orange-200">
                  À préparer
                </Badge>
              )}
            </div>
          </div>
          {setlist ? (
            <Link href={`/projection/setlists/${setlist.id}`}>
              <Button variant="outline" size="sm" className="text-xs gap-1 shrink-0">
                Voir la setlist
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          ) : (
            <Link href={`/projection/setlists/nouveau?culte=${culte.id}`}>
              <Button variant="outline" size="sm" className="text-xs gap-1 shrink-0">
                Créer la setlist
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>

        {/* Opérateurs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              role:    'operateur_diffusion',
              label:   'Diffusion écrans',
              icon:    Monitor,
              data:    diffusion,
            },
            {
              role:    'operateur_proclaim',
              label:   'Remplissage Proclaim',
              icon:    Keyboard,
              data:    proclaim,
            },
          ].map(({ role, label, icon: Icon, data }) => (
            <div
              key={role}
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                {data?.membres_projection ? (
                  <p className="text-sm font-semibold mt-0.5 truncate">
                    {data.membres_projection.prenom} {data.membres_projection.nom}
                  </p>
                ) : (
                  <Badge
                    variant="outline"
                    className="mt-0.5 text-[10px] px-1.5 py-0 h-4 bg-red-50 text-red-600 border-red-200"
                  >
                    Non assigné
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── DernieresSetlistsCard ──────────────────────────────────────────────────

function DernieresSetlistsCard({ setlists }: { setlists: Row[] }) {
  const STATUT_STYLE: Record<string, string> = {
    brouillon: 'bg-muted text-muted-foreground border-border',
    valide:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    utilise:   'bg-blue-50 text-blue-700 border-blue-200',
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <List className="h-4 w-4 text-muted-foreground" />
          Dernières setlists
        </CardTitle>
        <Link href="/projection/setlists">
          <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 px-2">
            Voir tout
            <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {setlists.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucune setlist créée pour le moment.
          </p>
        ) : (
          <div className="space-y-2">
            {setlists.map((s: Row) => {
              const dateCulte   = s.cultes?.date_culte ?? null
              const nbCantiques = Array.isArray(s.setlist_items) ? s.setlist_items.length : 0
              const statut      = s.statut as string ?? 'brouillon'

              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {s.titre_setlist ?? (dateCulte
                        ? `Culte du ${capitalize(formatDateLongue(dateCulte))}`
                        : 'Setlist sans titre'
                      )}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {nbCantiques} cantique{nbCantiques > 1 ? 's' : ''}
                      </span>
                      <span className="text-muted-foreground/40 text-xs">·</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-4 ${STATUT_STYLE[statut] ?? STATUT_STYLE.brouillon}`}
                      >
                        {statutSetlistLabel(statut)}
                      </Badge>
                    </div>
                  </div>
                  <Link href={`/projection/setlists/${s.id}`}>
                    <Button variant="outline" size="sm" className="text-xs gap-1 shrink-0 h-7 px-2">
                      Ouvrir
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── PageContent ────────────────────────────────────────────────────────────

async function PageContent() {
  const d = await getDashboardData()

  return (
    <div className="space-y-8">

      {/* Zone 1 — Prochain culte */}
      {d.prochainCulte ? (
        <ProchainCulteCard
          culte={d.prochainCulte}
          setlist={d.prochainSetlist}
          assignments={d.prochainAssignments}
        />
      ) : (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-2 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Aucun culte planifié à venir.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Zone 2 — Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          titre="Cantiques GAD"
          valeur={d.gadTotal}
          sous_titre={`dont ${d.gadActif} actif${d.gadActif > 1 ? 's' : ''}`}
          icone={Music}
          couleur="blue"
        />
        <StatCard
          titre="Répertoire Chorale"
          valeur={d.choraleTotal}
          sous_titre="cantiques en catalogue"
          icone={Users}
          couleur="amber"
        />
        <StatCard
          titre="Setlists ce mois"
          valeur={d.setlistsMois}
          sous_titre={d.mois}
          icone={List}
          couleur="violet"
        />
        <StatCard
          titre="+ utilisé"
          valeur={d.plusUtilise ? d.plusUtilise.nb_utilisations : '—'}
          sous_titre={d.plusUtilise ? d.plusUtilise.titre : 'Aucune utilisation'}
          icone={Star}
          couleur="emerald"
        />
      </div>

      {/* Zone 3 — Recherche rapide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Music className="h-4 w-4 text-muted-foreground" />
            Recherche rapide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RechercheRapide />
        </CardContent>
      </Card>

      {/* Zone 4 — Dernières setlists */}
      <DernieresSetlistsCard setlists={d.dernieresSetlists} />

    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-52 rounded-xl bg-muted" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl bg-muted" />)}
      </div>
      <div className="h-24 rounded-xl bg-muted" />
      <div className="h-48 rounded-xl bg-muted" />
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProjectionPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Vue d&apos;ensemble du module Projection &amp; Proclaim
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
