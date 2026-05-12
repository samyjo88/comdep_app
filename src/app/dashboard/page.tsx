import { Suspense, type ElementType } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Volume2, Monitor, Megaphone, Video, Share2,
  CalendarDays, Users, Clock,
  CheckCircle2, AlertCircle, Circle, ChevronRight,
  Wrench, AlertTriangle, Package2, FileText,
  Mail, Phone,
} from 'lucide-react'
import type { Metadata } from 'next'
import { CountdownDimanche }   from '@/components/dashboard/CountdownDimanche'
import { AjouterMembreDialog } from '@/components/dashboard/AjouterMembreDialog'

export const metadata: Metadata = { title: 'Dashboard' }

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateLongue(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDateCourte(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function initiales(prenom: string, nom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
}

function lundiSemaine(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  return monday.toISOString().slice(0, 10)
}

function dimancheSemaine(): string {
  const lundi = new Date(lundiSemaine() + 'T00:00:00')
  lundi.setDate(lundi.getDate() + 6)
  return lundi.toISOString().slice(0, 10)
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

interface MembreUnifie {
  id:          number
  prenom:      string
  nom:         string
  email:       string | null
  telephone:   string | null
  departement: string
  couleur:     string
  bg:          string
}

// ── Données ────────────────────────────────────────────────────────────────

async function getDashboardData() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const today    = new Date().toISOString().slice(0, 10)
  const lundi    = lundiSemaine()
  const dimanche = dimancheSemaine()

  const [
    sonPlanningRes,
    sonMembresRes,
    cultesRes,
    captationMembresRes,
    cmMembresRes,
    cmPostsEnAttenteRes,
    cantiquesRes,
    membresRes,
    projPlanningRes,
    materielAlerteRes,
    postsSemaineRes,
    cmSemaineRes,
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
      .select('id, prenom, nom, email, telephone, actif')
      .eq('actif', true),
    supabase
      .from('cultes')
      .select(`
        id, date_culte, theme, predicateur, statut,
        annonces(
          id, statut_global,
          rubriques_annonce(id, valide, texte_final, texte_genere)
        )
      `)
      .eq('statut', 'a_venir')
      .order('date_culte', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('membres_captation')
      .select('id, prenom, nom, email, telephone, actif')
      .eq('actif', true),
    supabase
      .from('membres_cm')
      .select('id, prenom, nom, email, telephone, actif')
      .eq('actif', true),
    supabase
      .from('posts')
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
    supabase
      .from('materiel_sono')
      .select('id, nom, marque, modele, statut, en_reparation, description_reparation')
      .or('en_reparation.eq.true,statut.eq.hors_service'),
    supabase
      .from('posts')
      .select('id, titre, plateforme, statut, date_publication_prevue')
      .in('plateforme', ['facebook', 'instagram', 'whatsapp'])
      .gte('date_publication_prevue', lundi)
      .lte('date_publication_prevue', dimanche)
      .order('date_publication_prevue', { ascending: true }),
    supabase
      .from('planning_cm')
      .select('id, semaine_debut, statut, membres_cm(id, prenom, nom)')
      .eq('semaine_debut', lundi)
      .maybeSingle(),
  ])

  const prochainSon:      Row | null = sonPlanningRes.data ?? null
  const membresSon:       Row[]      = sonMembresRes.data ?? []
  const prochainCulte:    Row | null = cultesRes.data ?? null
  const membresCaptation: Row[]      = captationMembresRes.data ?? []
  const membresCM:        Row[]      = cmMembresRes.data ?? []
  const postsPending:     Row[]      = cmPostsEnAttenteRes.data ?? []
  const cantiques:        Row[]      = cantiquesRes.data ?? []
  const membresGeneraux:  Row[]      = membresRes.data ?? []
  const projPlanning:     Row | null = projPlanningRes.data ?? null
  const materielAlerte:   Row[]      = materielAlerteRes.data ?? []
  const postsSemaine:     Row[]      = postsSemaineRes.data ?? []
  const cmSemaine:        Row | null = cmSemaineRes.data ?? null

  let captationAssignments: Row[] = []
  if (prochainCulte?.id) {
    const { data } = await supabase
      .from('planning_captation')
      .select('id, role_du_jour, membres_captation(id, prenom, nom)')
      .eq('culte_id', prochainCulte.id)
    captationAssignments = data ?? []
  }

  // ── Statuts modules ────────────────────────────────────────────────────────

  const statutSono: StatutModule =
    !prochainSon               ? 'incomplet' :
    prochainSon.responsable_id ? 'ok'        : 'action'

  const annonceStatut = prochainCulte?.annonces?.[0]?.statut_global
  const statutAnnonces: StatutModule =
    !prochainCulte                                             ? 'incomplet' :
    (annonceStatut === 'publie' || annonceStatut === 'valide') ? 'ok'        : 'action'

  const statutProjection: StatutModule =
    !projPlanning        ? 'incomplet' :
    cantiques.length > 0 ? 'ok'        : 'action'

  const statutCaptation: StatutModule =
    !prochainCulte                   ? 'incomplet' :
    captationAssignments.length >= 2 ? 'ok'        : 'action'

  const statutCommunity: StatutModule =
    membresCM.length === 0   ? 'incomplet' :
    postsPending.length > 0  ? 'action'    : 'ok'

  // ── Noms responsables ──────────────────────────────────────────────────────

  const idsSon = [
    prochainSon?.responsable_id,
    prochainSon?.assistant1_id,
    prochainSon?.assistant2_id,
  ].filter(Boolean)
  const responsablesSon = membresSon
    .filter((m: Row) => idsSon.includes(m.id))
    .map((m: Row) => `${m.prenom} ${m.nom}`)

  const responsablesProj: string[] = []
  if (projPlanning?.responsable_id) {
    const found = membresSon.find((m: Row) => m.id === projPlanning.responsable_id)
    if (found) responsablesProj.push(`${found.prenom} ${found.nom}`)
  }

  const responsablesCaptation = captationAssignments
    .map((a: Row) => a.membres_captation)
    .filter(Boolean)
    .map((m: Row) => `${m.prenom} ${m.nom}`)
    .slice(0, 3)

  const membreCM: string | null = cmSemaine?.membres_cm
    ? `${cmSemaine.membres_cm.prenom} ${cmSemaine.membres_cm.nom}`
    : null

  // ── Rubriques annonces ─────────────────────────────────────────────────────

  const rubriques: Row[] = prochainCulte?.annonces?.[0]?.rubriques_annonce ?? []
  const nbRubriquesTotal   = 7
  const nbRubriquesOk      = rubriques.filter((r: Row) => r.valide === true).length
  const nbRubriquesEnCours = rubriques.filter(
    (r: Row) => !r.valide && (r.texte_final || r.texte_genere)
  ).length
  const nbRubriquesAFaire  = nbRubriquesTotal - nbRubriquesOk - nbRubriquesEnCours

  // ── Matériel ───────────────────────────────────────────────────────────────

  const materielHorsService  = materielAlerte.filter((m: Row) => m.statut === 'hors_service')
  const materielEnReparation = materielAlerte.filter(
    (m: Row) => m.en_reparation && m.statut !== 'hors_service'
  )

  // ── Stats globales ─────────────────────────────────────────────────────────

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

  // ── Équipe unifiée ─────────────────────────────────────────────────────────

  const equipeUnifiee: MembreUnifie[] = [
    ...membresSon.map((m: Row) => ({
      id: m.id, prenom: m.prenom, nom: m.nom,
      email: m.email ?? null, telephone: m.telephone ?? null,
      departement: 'Sonorisation',
      couleur: 'text-blue-700 dark:text-blue-300',
      bg: 'bg-blue-100 dark:bg-blue-900/40',
    })),
    ...membresCaptation.map((m: Row) => ({
      id: m.id + 10000, prenom: m.prenom, nom: m.nom,
      email: m.email ?? null, telephone: m.telephone ?? null,
      departement: 'Captation',
      couleur: 'text-red-700 dark:text-red-300',
      bg: 'bg-red-100 dark:bg-red-900/40',
    })),
    ...membresCM.map((m: Row) => ({
      id: m.id + 20000, prenom: m.prenom, nom: m.nom,
      email: m.email ?? null, telephone: m.telephone ?? null,
      departement: 'Community',
      couleur: 'text-green-700 dark:text-green-300',
      bg: 'bg-green-100 dark:bg-green-900/40',
    })),
  ]

  // ── Infos par module ───────────────────────────────────────────────────────

  const sonoInfo: ModuleInfo = {
    prochainCulte: prochainSon
      ? { date: prochainSon.date_culte, responsables: responsablesSon }
      : null,
    statut:   statutSono,
    nbTaches: statutSono !== 'ok' ? 1 : 0,
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
    sonoInfo, projInfo, annoncesInfo, captationInfo, communityInfo,
    equipe: {
      dateProchainCulte,
      son:       { membres: responsablesSon },
      projection:{ membres: responsablesProj },
      captation: { membres: responsablesCaptation },
      cm:        { membre: membreCM },
    },
    annoncesWidget: {
      culteDate:    prochainCulte?.date_culte ?? null,
      annonceId:    prochainCulte?.annonces?.[0]?.id ?? null,
      ok:           nbRubriquesOk,
      enCours:      nbRubriquesEnCours,
      aFaire:       nbRubriquesAFaire,
      total:        nbRubriquesTotal,
      statutGlobal: annonceStatut ?? null,
    },
    materielWidget: {
      horsService:   materielHorsService,
      enReparation:  materielEnReparation,
      total:         materielAlerte.length,
    },
    postsCMWidget: {
      posts:    postsSemaine,
      lundi,
      dimanche,
    },
    equipeUnifiee,
  }
}

// ── Badge statut module ────────────────────────────────────────────────────

function BadgeStatut({ statut }: { statut: StatutModule }) {
  if (statut === 'ok') {
    return (
      <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 gap-1 text-xs shrink-0">
        <CheckCircle2 className="h-3 w-3" /> Tout va bien
      </Badge>
    )
  }
  if (statut === 'action') {
    return (
      <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 gap-1 text-xs shrink-0">
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
  icon:    ElementType
  label:   string
  href:    string
  iconCls: string
  info:    ModuleInfo
  primary?: boolean
}

function CarteModule({ icon: Icon, label, href, iconCls, info, primary }: CarteModuleProps) {
  if (primary) {
    return (
      <Card className="flex flex-col h-full bg-emerald-800 dark:bg-emerald-900 text-white border-emerald-900 hover:shadow-lg transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-700/60 shrink-0">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-semibold text-sm leading-tight text-white">{label}</p>
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/20 gap-1 text-xs shrink-0">
                {info.statut === 'ok'
                  ? <><CheckCircle2 className="h-3 w-3" /> Tout va bien</>
                  : info.statut === 'action'
                  ? <><AlertCircle className="h-3 w-3" /> Action requise</>
                  : <><Circle className="h-3 w-3" /> Incomplet</>
                }
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between gap-4 pt-0">
          <div className="space-y-1.5">
            {info.prochainCulte ? (
              <>
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                  <span className="text-xs text-emerald-200 truncate">
                    {capitalize(formatDateLongue(info.prochainCulte.date))}
                  </span>
                </div>
                {info.prochainCulte.responsables.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                    <span className="text-xs text-emerald-200 truncate">
                      {info.prochainCulte.responsables.join(', ')}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-emerald-300">Aucun culte planifié</p>
            )}
            {info.nbTaches > 0 && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                <span className="text-xs text-amber-200 font-medium">
                  {info.nbTaches} tâche{info.nbTaches > 1 ? 's' : ''} en attente
                </span>
              </div>
            )}
          </div>
          <Link href={href}>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs h-8 border-white/40 text-white hover:bg-white/10 hover:text-white bg-transparent"
            >
              Accéder <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

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
              <Clock className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
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

// ── Widget : Équipe du dimanche ────────────────────────────────────────────

interface EquipeData {
  dateProchainCulte: string | null
  son:        { membres: string[] }
  projection: { membres: string[] }
  captation:  { membres: string[] }
  cm:         { membre: string | null }
}

function WidgetEquipe({ data }: { data: EquipeData }) {
  const lignes = [
    { label: 'Son',        icon: Volume2,  membres: data.son.membres,        couleur: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-950/40'   },
    { label: 'Projection', icon: Monitor,  membres: data.projection.membres, couleur: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40' },
    { label: 'Captation',  icon: Video,    membres: data.captation.membres,  couleur: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-950/40'    },
    { label: 'CM',         icon: Share2,   membres: data.cm.membre ? [data.cm.membre] : [], couleur: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40' },
  ]
  const totalAssignes = lignes.reduce((sum, l) => sum + l.membres.length, 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Équipe du dimanche
          </CardTitle>
          {data.dateProchainCulte && (
            <span className="text-xs text-muted-foreground">
              {capitalize(formatDateCourte(data.dateProchainCulte))}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {!data.dateProchainCulte ? (
          <p className="text-xs text-muted-foreground py-2">Aucun culte planifié</p>
        ) : totalAssignes === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Aucun membre assigné</p>
        ) : (
          lignes.map(({ label, icon: Icon, membres, couleur, bg }) => (
            <div key={label} className="flex items-center gap-3 py-1.5 border-b last:border-0">
              <div className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${bg}`}>
                <Icon className={`h-3.5 w-3.5 ${couleur}`} />
              </div>
              <span className="text-xs font-medium w-20 shrink-0 text-muted-foreground">{label}</span>
              <div className="flex-1 min-w-0">
                {membres.length > 0
                  ? <p className="text-xs font-medium truncate">{membres.join(', ')}</p>
                  : <p className="text-xs text-muted-foreground italic">Non assigné</p>
                }
              </div>
              {membres.length > 0
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                : <AlertCircle  className="h-3.5 w-3.5 text-amber-400 dark:text-amber-300 shrink-0" />
              }
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// ── Widget : Annonces ──────────────────────────────────────────────────────

interface AnnoncesWidgetData {
  culteDate:    string | null
  annonceId:    string | null
  ok:           number
  enCours:      number
  aFaire:       number
  total:        number
  statutGlobal: string | null
}

function WidgetAnnonces({ data }: { data: AnnoncesWidgetData }) {
  const pct = data.total > 0 ? Math.round((data.ok / data.total) * 100) : 0
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-muted-foreground" />
            Annonces
          </CardTitle>
          {data.culteDate && (
            <span className="text-xs text-muted-foreground">
              {capitalize(formatDateCourte(data.culteDate))}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {!data.culteDate ? (
          <p className="text-xs text-muted-foreground py-2">Aucun culte planifié</p>
        ) : (
          <>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{data.ok} / {data.total} rubriques validées</span>
                <span className="font-medium">{pct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/40 p-2">
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">{data.ok}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-tight">Prêtes</p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/40 p-2">
                <p className="text-lg font-bold text-amber-700 dark:text-amber-300 tabular-nums">{data.enCours}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 leading-tight">En cours</p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <p className="text-lg font-bold text-muted-foreground tabular-nums">{data.aFaire}</p>
                <p className="text-xs text-muted-foreground leading-tight">À faire</p>
              </div>
            </div>
            <Link href={data.annonceId ? `/annonces/${data.annonceId}/rubriques` : '/annonces'}>
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-8 mt-1">
                <FileText className="h-3.5 w-3.5" />
                Préparer les annonces
                <ChevronRight className="h-3.5 w-3.5 ml-auto" />
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Widget : Matériel en alerte ────────────────────────────────────────────

interface MaterielWidgetData {
  horsService:  Row[]
  enReparation: Row[]
  total:        number
}

function WidgetMateriel({ data }: { data: MaterielWidgetData }) {
  const aDesAlerts = data.total > 0
  return (
    <Card className={aDesAlerts ? 'border-red-200 dark:border-red-800' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package2 className="h-4 w-4 text-muted-foreground" />
            Matériel en alerte
          </CardTitle>
          {aDesAlerts && (
            <Badge className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 gap-1 text-xs">
              <AlertTriangle className="h-3 w-3" />
              {data.total} alerte{data.total > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {!aDesAlerts ? (
          <div className="flex items-center gap-2 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Tout le matériel est en ordre</p>
          </div>
        ) : (
          <>
            {data.horsService.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1 mb-1.5">
                  <AlertTriangle className="h-3 w-3" /> Hors service ({data.horsService.length})
                </p>
                {data.horsService.map((m: Row) => (
                  <div key={m.id} className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.nom}</p>
                      {(m.marque || m.modele) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[m.marque, m.modele].filter(Boolean).join(' ')}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs shrink-0">
                      Hors service
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {data.enReparation.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1.5">
                  <Wrench className="h-3 w-3" /> En réparation ({data.enReparation.length})
                </p>
                {data.enReparation.map((m: Row) => (
                  <div key={m.id} className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.nom}</p>
                      {m.description_reparation && (
                        <p className="text-xs text-muted-foreground truncate">{m.description_reparation}</p>
                      )}
                    </div>
                    <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs shrink-0">
                      Réparation
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Link href="/sonorisation/materiel">
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-8 mt-2">
                <Package2 className="h-3.5 w-3.5" />
                Voir le matériel
                <ChevronRight className="h-3.5 w-3.5 ml-auto" />
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Widget : Posts Community Management ───────────────────────────────────

const PLATEFORME_CONFIG: Record<string, { label: string; icone: string; bg: string }> = {
  facebook:  { label: 'Facebook',  icone: '📘', bg: 'bg-blue-50 dark:bg-blue-950/40'  },
  instagram: { label: 'Instagram', icone: '📸', bg: 'bg-pink-50 dark:bg-pink-950/40'  },
  whatsapp:  { label: 'WhatsApp',  icone: '💬', bg: 'bg-green-50 dark:bg-green-950/40' },
}

const STATUT_POST_CONFIG: Record<string, { label: string; cls: string }> = {
  a_faire:               { label: 'À faire',    cls: 'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/60' },
  en_creation:           { label: 'En création',cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40' },
  en_attente_validation: { label: 'En attente', cls: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40' },
  programme:             { label: 'Programmé',  cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40' },
  publie:                { label: 'Publié',     cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40' },
  annule:                { label: 'Annulé',     cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40' },
}

interface PostsCMWidgetData {
  posts:    Row[]
  lundi:    string
  dimanche: string
}

function WidgetPostsCM({ data }: { data: PostsCMWidgetData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            Posts Community
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Sem. du {capitalize(formatDateCourte(data.lundi))}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {data.posts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Aucun post planifié cette semaine</p>
        ) : (
          <>
            <div className="space-y-1.5">
              {data.posts.map((post: Row) => {
                const pf   = PLATEFORME_CONFIG[post.plateforme] ?? { label: post.plateforme, icone: '📣', bg: 'bg-muted' }
                const stat = STATUT_POST_CONFIG[post.statut]    ?? { label: post.statut, cls: 'bg-muted text-muted-foreground border-muted' }
                return (
                  <div key={post.id} className="flex items-center gap-2.5 py-1.5 border-b last:border-0">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-lg text-sm shrink-0 ${pf.bg}`}>
                      {pf.icone}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{post.titre ?? pf.label}</p>
                      {post.date_publication_prevue && (
                        <p className="text-xs text-muted-foreground">
                          {capitalize(formatDateCourte(post.date_publication_prevue))}
                        </p>
                      )}
                    </div>
                    <Badge className={`text-xs shrink-0 ${stat.cls}`}>{stat.label}</Badge>
                  </div>
                )
              })}
            </div>
            <Link href="/community/posts">
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-8 mt-1">
                <Share2 className="h-3.5 w-3.5" />
                Gérer les posts
                <ChevronRight className="h-3.5 w-3.5 ml-auto" />
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Section : Liste complète de l'équipe ──────────────────────────────────

const DEPT_COLORS: Record<string, { badge: string; avatarBg: string; avatarText: string }> = {
  Sonorisation: {
    badge:      'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    avatarBg:   'bg-blue-600',
    avatarText: 'text-white',
  },
  Captation: {
    badge:      'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
    avatarBg:   'bg-red-600',
    avatarText: 'text-white',
  },
  Community: {
    badge:      'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
    avatarBg:   'bg-green-600',
    avatarText: 'text-white',
  },
}

function SectionEquipe({ membres }: { membres: MembreUnifie[] }) {
  return (
    <section id="equipe">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">Équipe</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {membres.length} membre{membres.length > 1 ? 's' : ''} actif{membres.length > 1 ? 's' : ''}
          </p>
        </div>
        <AjouterMembreDialog />
      </div>

      {membres.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">Aucun membre enregistré</p>
            <p className="text-xs text-muted-foreground mt-1">
              Utilisez le bouton ci-dessus pour ajouter des membres à vos équipes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {membres.map((m) => {
            const dc = DEPT_COLORS[m.departement] ?? {
              badge:      'bg-muted text-muted-foreground border-muted',
              avatarBg:   'bg-muted',
              avatarText: 'text-foreground',
            }
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-sm transition-shadow"
              >
                {/* Avatar initiales */}
                <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${dc.avatarBg}`}>
                  <span className={`text-sm font-bold ${dc.avatarText}`}>
                    {initiales(m.prenom, m.nom)}
                  </span>
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.prenom} {m.nom}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <Badge className={`text-[10px] px-1.5 py-0 h-4 border ${dc.badge}`}>
                      {m.departement}
                    </Badge>
                    {m.email && (
                      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground truncate">
                        <Mail className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate max-w-[120px]">{m.email}</span>
                      </span>
                    )}
                    {m.telephone && !m.email && (
                      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                        <Phone className="h-2.5 w-2.5 shrink-0" />
                        {m.telephone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-32 rounded-2xl bg-muted" />
      <div className="space-y-4">
        <div className="h-5 w-24 rounded bg-muted" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-44 rounded-xl bg-muted" />)}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-5 w-32 rounded bg-muted" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-16 rounded-xl bg-muted" />)}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-52 rounded-xl bg-muted" />)}
      </div>
    </div>
  )
}

// ── Contenu principal ──────────────────────────────────────────────────────

async function PageContent() {
  const d = await getDashboardData()

  return (
    <div className="space-y-8">

      {/* Compte à rebours dimanche */}
      <CountdownDimanche
        prochainCulteDate={d.dateProchainCulte}
        nbMembresActifs={d.nbMembresActifs}
        tachesEnAttente={d.tachesEnAttente}
      />

      {/* Accès aux modules */}
      <section id="modules">
        <h2 className="text-base font-semibold mb-4">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <CarteModule
            icon={Volume2} label="Sonorisation" href="/sonorisation"
            iconCls="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
            info={d.sonoInfo} primary
          />
          <CarteModule
            icon={Monitor} label="Projection / Proclaim" href="/projection"
            iconCls="bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400"
            info={d.projInfo}
          />
          <CarteModule
            icon={Megaphone} label="Annonces" href="/annonces"
            iconCls="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
            info={d.annoncesInfo}
          />
          <CarteModule
            icon={Video} label="Captation Vidéo" href="/captation"
            iconCls="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
            info={d.captationInfo}
          />
          <CarteModule
            icon={Share2} label="Community Management" href="/community"
            iconCls="bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400"
            info={d.communityInfo}
          />
        </div>
      </section>

      {/* Liste complète de l'équipe */}
      <SectionEquipe membres={d.equipeUnifiee} />

      {/* Statistiques */}
      <section id="stats">
        <h2 className="text-base font-semibold mb-4">Statistiques</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WidgetEquipe   data={d.equipe}          />
          <WidgetAnnonces data={d.annoncesWidget}   />
          <WidgetMateriel data={d.materielWidget}   />
          <WidgetPostsCM  data={d.postsCMWidget}    />
        </div>
      </section>

    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-7 px-5 max-w-5xl space-y-2">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Vue d&apos;ensemble du département de communication
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
