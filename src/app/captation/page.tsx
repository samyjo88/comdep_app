import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users, CalendarDays, PackageCheck, HardDrive,
  ChevronRight, Camera, ImageIcon, Palette,
  AlertCircle, Clock, Clapperboard,
} from 'lucide-react'
import { ROLES_CONFIG } from '@/types/captation'
import type { RoleCaptation } from '@/types/captation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tableau de bord' }

// ── Helpers ────────────────────────────────────────────────────────────────

function debutDeMois(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function finDeMois(): string {
  const d   = new Date()
  const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`
}

function nomMois(): string {
  return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function formatDateLongue(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatDateLimite(dateStr: string): { label: string; retard: boolean } {
  const date  = new Date(dateStr + 'T00:00:00')
  const today = new Date(new Date().toDateString())
  const diff  = Math.round((date.getTime() - today.getTime()) / 86400000)

  if (diff < 0)  return { label: `Retard de ${Math.abs(diff)} j.`, retard: true }
  if (diff === 0) return { label: "Aujourd'hui",                     retard: false }
  if (diff === 1) return { label: 'Demain',                          retard: false }
  return { label: `Dans ${diff} j.`, retard: false }
}

function formatRelative(dateStr: string): string {
  const diff = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diff < 1)   return "à l'instant"
  if (diff < 60)  return `il y a ${diff} min`
  if (diff < 1440) return `il y a ${Math.round(diff / 60)} h`
  return `il y a ${Math.round(diff / 1440)} j`
}

const ROLE_ICON: Record<RoleCaptation, typeof Camera> = {
  cameraman:     Camera,
  photographe:   ImageIcon,
  infographiste: Palette,
}

const LIVRABLE_LABELS: Record<string, string> = {
  video_brute:           'Vidéo brute',
  video_montee:          'Vidéo montée',
  photos_selectionnees:  'Photos sélectionnées',
  visuel_reseaux:        'Visuel réseaux',
  autre:                 'Autre',
}

const STATUT_LIVRAISON_LABELS: Record<string, string> = {
  a_faire:  'À faire',
  en_cours: 'En cours',
  livre:    'Livré',
  valide:   'Validé',
}

// ── getDashboardData ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

async function getDashboardData() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const today   = new Date().toISOString().slice(0, 10)
  const in7days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const [
    membresRes,
    cultesRes,
    livraisonStatRes,
    driveRes,
    prochainRes,
    livraisonsUrgentesRes,
    planningRecentRes,
    livraisonsRecentRes,
  ] = await Promise.all([
    supabase.from('membres_captation').select('id').eq('actif', true),
    supabase.from('cultes')
      .select('id, planning_captation(id)')
      .gte('date_culte', debutDeMois())
      .lte('date_culte', finDeMois()),
    supabase.from('livraisons_captation').select('id').in('statut', ['a_faire', 'en_cours']),
    supabase.from('dossiers_drive').select('espace_utilise_mb'),
    supabase.from('cultes')
      .select('id, date_culte, theme, predicateur')
      .gte('date_culte', today)
      .order('date_culte', { ascending: true })
      .limit(1),
    supabase.from('livraisons_captation')
      .select('id, culte_id, type_livrable, nom_fichier, statut, date_limite, membres_captation(prenom, nom)')
      .neq('statut', 'valide')
      .not('date_limite', 'is', null)
      .lte('date_limite', in7days)
      .order('date_limite', { ascending: true })
      .limit(10),
    supabase.from('planning_captation')
      .select('id, culte_id, role_du_jour, statut, created_at, membres_captation(prenom, nom)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('livraisons_captation')
      .select('id, culte_id, type_livrable, nom_fichier, statut, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Assignments du prochain culte (requête séquentielle — dépend du résultat précédent)
  const prochainCulte: Row | null = prochainRes.data?.[0] ?? null
  let prochainAssignments: Row[] = []
  if (prochainCulte) {
    const { data } = await supabase
      .from('planning_captation')
      .select('role_du_jour, statut, membres_captation(id, prenom, nom)')
      .eq('culte_id', prochainCulte.id)
    prochainAssignments = data ?? []
  }

  // Stats calculées côté JS
  const membresActifs   = membresRes.data?.length ?? 0
  const cultesCouverts  = (cultesRes.data ?? []).filter(
    (c: Row) => (c.planning_captation as Row[])?.length > 0,
  ).length
  const livrables_attente = livraisonStatRes.data?.length ?? 0
  const espaceTotal_mb    = (driveRes.data ?? []).reduce(
    (s: number, d: Row) => s + (d.espace_utilise_mb ?? 0), 0,
  )

  // Fusion des dernières activités
  const planningRecent = (planningRecentRes.data ?? []).map((p: Row) => ({
    id:         p.id,
    type:       'planning' as const,
    created_at: p.created_at as string,
    label:      ROLES_CONFIG.find(r => r.code === p.role_du_jour)?.label ?? p.role_du_jour,
    detail:     p.membres_captation
      ? `${p.membres_captation.prenom} ${p.membres_captation.nom}`
      : '—',
    icone:      'planning',
  }))

  const livraisonsRecent = (livraisonsRecentRes.data ?? []).map((l: Row) => ({
    id:         l.id,
    type:       'livraison' as const,
    created_at: l.created_at as string,
    label:      LIVRABLE_LABELS[l.type_livrable] ?? l.type_livrable,
    detail:     STATUT_LIVRAISON_LABELS[l.statut] ?? l.statut,
    icone:      'livraison',
  }))

  const dernieresActivites = [...planningRecent, ...livraisonsRecent]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)

  return {
    membresActifs,
    cultesCouverts,
    livrables_attente,
    espaceTotal_mb,
    prochainCulte,
    prochainAssignments,
    livraisonsUrgentes: (livraisonsUrgentesRes.data ?? []) as Row[],
    dernieresActivites,
    mois: nomMois(),
  }
}

// ── StatCard ───────────────────────────────────────────────────────────────

function StatCard({
  titre, valeur, sous_titre, icone: Icon, couleur,
}: {
  titre:      string
  valeur:     string | number
  sous_titre: string
  icone:      typeof Users
  couleur:    'blue' | 'violet' | 'amber' | 'emerald'
}) {
  const bg: Record<typeof couleur, string> = {
    blue:    'bg-blue-50 text-blue-600',
    violet:  'bg-violet-50 text-violet-600',
    amber:   'bg-amber-50 text-amber-600',
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
  assignments,
}: {
  culte:       Row
  assignments: Row[]
}) {
  const assignmentsByRole = Object.fromEntries(
    assignments.map((a: Row) => [a.role_du_jour, a]),
  )

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Prochain culte
          </CardTitle>
          <p className="text-lg font-bold mt-1">
            {capitalize(formatDateLongue(culte.date_culte))}
          </p>
          {culte.theme && (
            <p className="text-sm text-muted-foreground mt-0.5">{culte.theme}</p>
          )}
        </div>
        <Link href={`/captation/planning?culte=${culte.id}`}>
          <Button size="sm" className="shrink-0 gap-1 text-xs">
            Gérer ce culte
            <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ROLES_CONFIG.map(role => {
            const assignment = assignmentsByRole[role.code]
            const RoleIcon   = ROLE_ICON[role.code as RoleCaptation]
            return (
              <div
                key={role.code}
                className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-background shrink-0">
                  <RoleIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">{role.label}</p>
                  {assignment?.membres_captation ? (
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <p className="text-sm font-semibold truncate">
                        {assignment.membres_captation.prenom} {assignment.membres_captation.nom}
                      </p>
                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                        Assigné
                      </Badge>
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className="mt-0.5 text-[10px] px-1.5 py-0 h-4 bg-red-50 text-red-600 border-red-200"
                    >
                      À assigner
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ── LivraisonsUrgentesCard ─────────────────────────────────────────────────

function LivraisonsUrgentesCard({ livraisons }: { livraisons: Row[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          Livrables urgents
          {livraisons.length > 0 && (
            <Badge variant="outline" className="ml-auto text-xs bg-amber-50 text-amber-700 border-amber-200">
              {livraisons.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {livraisons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun livrable urgent dans les 7 prochains jours.
          </p>
        ) : (
          <div className="space-y-2">
            {livraisons.map((l: Row) => {
              const { label: dateLabel, retard } = formatDateLimite(l.date_limite)
              const nom = l.nom_fichier ?? LIVRABLE_LABELS[l.type_livrable] ?? l.type_livrable
              const assignee = l.membres_captation
                ? `${l.membres_captation.prenom} ${l.membres_captation.nom}`
                : null
              return (
                <div
                  key={l.id}
                  className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{nom}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {LIVRABLE_LABELS[l.type_livrable] ?? l.type_livrable}
                      </Badge>
                      {assignee && (
                        <span className="text-xs text-muted-foreground">{assignee}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium shrink-0 ${
                      retard ? 'text-red-600' : 'text-amber-600'
                    }`}
                  >
                    {dateLabel}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── DernieresActivitesCard ─────────────────────────────────────────────────

type Activite = {
  id:         string
  type:       'planning' | 'livraison'
  created_at: string
  label:      string
  detail:     string
}

function DernieresActivitesCard({ activites }: { activites: Activite[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Dernières activités
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activites.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune activité récente.
          </p>
        ) : (
          <div className="space-y-3">
            {activites.map(a => (
              <div key={`${a.type}-${a.id}`} className="flex items-start gap-3">
                <div className={`mt-0.5 flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${
                  a.type === 'planning'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-violet-50 text-violet-600'
                }`}>
                  {a.type === 'planning'
                    ? <CalendarDays className="h-3.5 w-3.5" />
                    : <Clapperboard className="h-3.5 w-3.5" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight truncate">{a.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                  {formatRelative(a.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── PageContent ────────────────────────────────────────────────────────────

async function PageContent() {
  const d = await getDashboardData()
  const espaceGB = d.espaceTotal_mb > 0
    ? (d.espaceTotal_mb / 1024).toFixed(1)
    : null

  return (
    <div className="space-y-8">

      {/* Rangée 1 — Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          titre="Cultes couverts"
          valeur={d.cultesCouverts}
          sous_titre={`ce mois · ${d.mois}`}
          icone={CalendarDays}
          couleur="blue"
        />
        <StatCard
          titre="Membres actifs"
          valeur={d.membresActifs}
          sous_titre="dans l'équipe captation"
          icone={Users}
          couleur="violet"
        />
        <StatCard
          titre="Livrables en attente"
          valeur={d.livrables_attente}
          sous_titre="à faire ou en cours"
          icone={PackageCheck}
          couleur="amber"
        />
        <StatCard
          titre="Espace Drive"
          valeur={espaceGB ? `${espaceGB} GB` : '—'}
          sous_titre={espaceGB ? 'utilisés au total' : 'non synchronisé'}
          icone={HardDrive}
          couleur="emerald"
        />
      </div>

      {/* Rangée 2 — Prochain culte */}
      {d.prochainCulte ? (
        <ProchainCulteCard
          culte={d.prochainCulte}
          assignments={d.prochainAssignments}
        />
      ) : (
        <Card>
          <CardContent className="py-8 flex flex-col items-center gap-2 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Aucun culte planifié à venir.
            </p>
            <Link href="/captation/planning">
              <Button variant="outline" size="sm" className="mt-1 gap-1 text-xs">
                Voir le planning
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Rangées 3 & 4 — Livrables urgents + Dernières activités */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LivraisonsUrgentesCard livraisons={d.livraisonsUrgentes} />
        <DernieresActivitesCard activites={d.dernieresActivites} />
      </div>

    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl bg-muted" />)}
      </div>
      <div className="h-44 rounded-xl bg-muted" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-56 rounded-xl bg-muted" />
        <div className="h-56 rounded-xl bg-muted" />
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function CaptationPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Vue d&apos;ensemble de l&apos;équipe captation
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
