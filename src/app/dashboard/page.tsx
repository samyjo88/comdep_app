import { Suspense, type ElementType } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Volume2, Monitor, Megaphone, Video, Share2,
  CalendarDays, Users, Clock,
  CheckCircle2, AlertCircle, Circle, ChevronRight,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard – ComDept' }

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateLongue(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Types ──────────────────────────────────────────────────────────────────

type StatutModule = 'ok' | 'action' | 'incomplet'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

interface ModuleInfo {
  prochainCulte: { date: string; responsables: string[] } | null
  statut:        StatutModule
  nbTaches:      number
}

// ── Données ────────────────────────────────────────────────────────────────

async function getDashboardData() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const today = new Date().toISOString().slice(0, 10)

  const [
    sonPlanningRes,
    sonMembresRes,
    cultesRes,
    captationMembresRes,
    cmMembresRes,
    cmPostsRes,
    cantiquesRes,
    membresRes,
    projPlanningRes,
  ] = await Promise.all([
    supabase
      .from('planning_son')
      .select('id, date_culte, statut, responsable_id, assistant1_id, assistant2_id')
      .gte('date_culte', today)
      .neq('statut', 'passe')
      .order('date_culte', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('membres_son')
      .select('id, prenom, nom, actif')
      .eq('actif', true),
    supabase
      .from('cultes')
      .select('id, date_culte, theme, predicateur, statut, annonces(statut_global)')
      .eq('statut', 'a_venir')
      .order('date_culte', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('membres_captation')
      .select('id, prenom, nom, actif')
      .eq('actif', true),
    supabase
      .from('membres_cm')
      .select('id, prenom, nom, actif')
      .eq('actif', true),
    supabase
      .from('posts_cm')
      .select('id, statut')
      .in('statut', ['a_faire', 'en_creation', 'en_attente_validation']),
    supabase
      .from('cantiques')
      .select('id, titre, statut')
      .gte('date_culte', today)
      .limit(10),
    supabase
      .from('membres')
      .select('id, actif')
      .eq('actif', true),
    supabase
      .from('plannings_semaine')
      .select('id, date_culte, responsable_id')
      .gte('date_culte', today)
      .order('date_culte', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  const prochainSon:       Row | null = sonPlanningRes.data ?? null
  const membresSon:        Row[]      = sonMembresRes.data ?? []
  const prochainCulte:     Row | null = cultesRes.data ?? null
  const membresCaptation:  Row[]      = captationMembresRes.data ?? []
  const membresCM:         Row[]      = cmMembresRes.data ?? []
  const postsPending:      Row[]      = cmPostsRes.data ?? []
  const cantiques:         Row[]      = cantiquesRes.data ?? []
  const membresGeneraux:   Row[]      = membresRes.data ?? []
  const projPlanning:      Row | null = projPlanningRes.data ?? null

  // Captation : assignments pour le prochain culte (query secondaire)
  let captationAssignments: Row[] = []
  if (prochainCulte?.id) {
    const { data } = await supabase
      .from('planning_captation')
      .select('id, role_du_jour, membres_captation(prenom, nom)')
      .eq('culte_id', prochainCulte.id)
    captationAssignments = data ?? []
  }

  // ── Statuts ──

  const statutSono: StatutModule =
    !prochainSon             ? 'incomplet' :
    prochainSon.responsable_id ? 'ok'      : 'action'

  const annonceStatut = prochainCulte?.annonces?.[0]?.statut_global
  const statutAnnonces: StatutModule =
    !prochainCulte                                               ? 'incomplet' :
    (annonceStatut === 'publie' || annonceStatut === 'valide')   ? 'ok'        : 'action'

  const statutProjection: StatutModule =
    !projPlanning          ? 'incomplet' :
    cantiques.length > 0   ? 'ok'        : 'action'

  const statutCaptation: StatutModule =
    !prochainCulte                       ? 'incomplet' :
    captationAssignments.length >= 2     ? 'ok'        : 'action'

  const statutCommunity: StatutModule =
    membresCM.length === 0     ? 'incomplet' :
    postsPending.length > 0    ? 'action'    : 'ok'

  // ── Responsables Sonorisation ──

  const idsSon = [
    prochainSon?.responsable_id,
    prochainSon?.assistant1_id,
    prochainSon?.assistant2_id,
  ].filter(Boolean)
  const responsablesSon = membresSon
    .filter((m: Row) => idsSon.includes(m.id))
    .map((m: Row) => `${m.prenom} ${m.nom}`)

  // ── Responsables Projection ──
  const responsablesProj: string[] = []
  if (projPlanning?.responsable_id) {
    const found = membresSon.find((m: Row) => m.id === projPlanning.responsable_id)
    if (found) responsablesProj.push(`${found.prenom} ${found.nom}`)
  }

  // ── Responsables Captation ──
  const responsablesCaptation = captationAssignments
    .map((a: Row) => a.membres_captation)
    .filter(Boolean)
    .map((m: Row) => `${m.prenom} ${m.nom}`)
    .slice(0, 3)

  // ── Statistiques bannière ──

  const nbMembresActifs =
    membresGeneraux.length > 0
      ? membresGeneraux.length
      : membresSon.length + membresCaptation.length + membresCM.length

  const modules: StatutModule[] = [
    statutSono, statutProjection, statutAnnonces, statutCaptation, statutCommunity,
  ]
  const tachesEnAttente = postsPending.length +
    modules.filter(s => s === 'action' || s === 'incomplet').length

  const dateProchainCulte =
    prochainSon?.date_culte ??
    prochainCulte?.date_culte ??
    null

  // ── Infos par module (format unifié pour les cartes) ──

  const sonoInfo: ModuleInfo = {
    prochainCulte: prochainSon
      ? { date: prochainSon.date_culte, responsables: responsablesSon }
      : null,
    statut:    statutSono,
    nbTaches:  statutSono !== 'ok' ? 1 : 0,
  }

  const projInfo: ModuleInfo = {
    prochainCulte: projPlanning
      ? { date: projPlanning.date_culte, responsables: responsablesProj }
      : null,
    statut:   statutProjection,
    nbTaches: cantiques.length === 0 && projPlanning ? 1 : 0,
  }

  const annoncesInfo: ModuleInfo = {
    prochainCulte: prochainCulte
      ? {
          date:         prochainCulte.date_culte,
          responsables: prochainCulte.predicateur ? [prochainCulte.predicateur] : [],
        }
      : null,
    statut:   statutAnnonces,
    nbTaches: statutAnnonces !== 'ok' ? 1 : 0,
  }

  const captationInfo: ModuleInfo = {
    prochainCulte: prochainCulte
      ? { date: prochainCulte.date_culte, responsables: responsablesCaptation }
      : null,
    statut:   statutCaptation,
    nbTaches: captationAssignments.length === 0 && prochainCulte ? 1 : 0,
  }

  const communityInfo: ModuleInfo = {
    prochainCulte: prochainCulte
      ? { date: prochainCulte.date_culte, responsables: [] }
      : null,
    statut:   statutCommunity,
    nbTaches: postsPending.length,
  }

  return {
    dateProchainCulte,
    nbMembresActifs,
    tachesEnAttente,
    sonoInfo,
    projInfo,
    annoncesInfo,
    captationInfo,
    communityInfo,
  }
}

// ── Badge statut ───────────────────────────────────────────────────────────

function BadgeStatut({ statut }: { statut: StatutModule }) {
  if (statut === 'ok') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1 text-xs shrink-0">
        <CheckCircle2 className="h-3 w-3" /> Tout va bien
      </Badge>
    )
  }
  if (statut === 'action') {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 gap-1 text-xs shrink-0">
        <AlertCircle className="h-3 w-3" /> Action requise
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1 text-xs text-muted-foreground shrink-0">
      <Circle className="h-3 w-3" /> Incomplet
    </Badge>
  )
}

// ── Carte module ───────────────────────────────────────────────────────────

interface CarteModuleProps {
  icon:        ElementType
  label:       string
  href:        string
  iconCls:     string
  info:        ModuleInfo
}

function CarteModule({ icon: Icon, label, href, iconCls, info }: CarteModuleProps) {
  return (
    <Card className="flex flex-col h-full transition-all duration-200 hover:shadow-md hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${iconCls}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-semibold text-sm leading-tight">{label}</p>
            <BadgeStatut statut={info.statut} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between gap-4 pt-0">
        <div className="space-y-1.5">
          {info.prochainCulte ? (
            <>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {capitalize(formatDateLongue(info.prochainCulte.date))}
                </span>
              </div>
              {info.prochainCulte.responsables.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">
                    {info.prochainCulte.responsables.join(', ')}
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Aucun culte planifié</p>
          )}
          {info.nbTaches > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-xs text-amber-600 font-medium">
                {info.nbTaches} tâche{info.nbTaches > 1 ? 's' : ''} en attente
              </span>
            </div>
          )}
        </div>

        <Link href={href}>
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-8">
            Accéder <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-24 rounded-2xl bg-muted" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-48 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  )
}

// ── Contenu principal ──────────────────────────────────────────────────────

async function PageContent() {
  const d = await getDashboardData()

  return (
    <div className="space-y-8">

      {/* Bannière prochain culte */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">

          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 shrink-0">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Prochain culte
              </p>
              <p className="font-semibold text-sm truncate">
                {d.dateProchainCulte
                  ? capitalize(formatDateLongue(d.dateProchainCulte))
                  : 'Aucun culte planifié'}
              </p>
            </div>
          </div>

          <div className="hidden sm:block w-px h-10 bg-border" />

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50 shrink-0">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Membres actifs
              </p>
              <p className="font-semibold text-sm tabular-nums">
                {d.nbMembresActifs}
              </p>
            </div>
          </div>

          <div className="hidden sm:block w-px h-10 bg-border" />

          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${
              d.tachesEnAttente > 0 ? 'bg-amber-50' : 'bg-emerald-50'
            }`}>
              <Clock className={`h-5 w-5 ${
                d.tachesEnAttente > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tâches en attente
              </p>
              <p className={`font-semibold text-sm tabular-nums ${
                d.tachesEnAttente > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {d.tachesEnAttente > 0 ? d.tachesEnAttente : 'Tout à jour'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grille des modules */}
      <div>
        <h2 className="text-base font-semibold mb-4">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <CarteModule
            icon={Volume2}
            label="Sonorisation"
            href="/sonorisation"
            iconCls="bg-blue-50 text-blue-600"
            info={d.sonoInfo}
          />
          <CarteModule
            icon={Monitor}
            label="Projection / Proclaim"
            href="/projection"
            iconCls="bg-purple-50 text-purple-600"
            info={d.projInfo}
          />
          <CarteModule
            icon={Megaphone}
            label="Annonces"
            href="/annonces"
            iconCls="bg-amber-50 text-amber-600"
            info={d.annoncesInfo}
          />
          <CarteModule
            icon={Video}
            label="Captation Vidéo"
            href="/captation"
            iconCls="bg-red-50 text-red-600"
            info={d.captationInfo}
          />
          <CarteModule
            icon={Share2}
            label="Community Management"
            href="/community"
            iconCls="bg-green-50 text-green-600"
            info={d.communityInfo}
          />
        </div>
      </div>

    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Vue d&apos;ensemble</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          État de tous les modules du département de communication
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
