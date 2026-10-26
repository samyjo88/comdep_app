// Cartes et widgets du tableau de bord
import { type ElementType } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Volume2, Monitor, Megaphone, Video, Share2, CalendarDays, Users, Clock, CheckCircle2, AlertCircle, Circle, ChevronRight, Wrench, AlertTriangle, Package2, FileText, Mail, Phone, Zap,
} from 'lucide-react'
import { AjouterMembreDialog } from '@/components/dashboard/AjouterMembreDialog'
import { capitalize, formatDateLong as formatDateLongue } from '@/lib/utils'
import type { StatutModule, ModuleInfo, MembreUnifie, Row } from '../_lib/data'

function formatDateCourte(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function initiales(prenom: string, nom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
}

// ── Badge statut module ────────────────────────────────────────────────────

function BadgeStatut({ statut }: { statut: StatutModule }) {
  if (statut === 'ok') {
    return (
      <Badge className="bg-success/15 dark:bg-success/5 text-success dark:text-success border-success/30 dark:border-success/30 hover:bg-success/15 dark:hover:bg-success/5 gap-1 text-xs shrink-0">
        <CheckCircle2 className="h-3 w-3" /> Tout va bien
      </Badge>
    )
  }
  if (statut === 'urgent') {
    return (
      <Badge className="bg-danger/15 dark:bg-danger/5 text-danger dark:text-danger border-danger/30 dark:border-danger/30 hover:bg-danger/15 dark:hover:bg-danger/5 gap-1 text-xs shrink-0">
        <Zap className="h-3 w-3" /> Urgent
      </Badge>
    )
  }
  if (statut === 'action') {
    return (
      <Badge className="bg-warning/15 dark:bg-warning/5 text-warning dark:text-warning border-warning/30 dark:border-warning/30 hover:bg-warning/15 dark:hover:bg-warning/5 gap-1 text-xs shrink-0">
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
  module:  string
  iconCls?: string
  info:    ModuleInfo
  primary?: boolean
}

export function CarteModule({ icon: Icon, label, href, module, iconCls = 'bg-module/10 text-module', info, primary }: CarteModuleProps) {
  if (primary) {
    return (
      <Card data-module={module} className="card-hover relative flex h-full flex-col overflow-hidden border-0 bg-gradient-to-br from-[#3d6b27] via-brand-green to-[#86a93b] text-white shadow-lg shadow-primary/20">
        <Icon aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 text-white/10" />
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 ring-1 ring-white/25 shrink-0">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-semibold text-sm leading-tight text-white">{label}</p>
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/20 gap-1 text-xs shrink-0">
                {info.statut === 'ok'      ? <><CheckCircle2 className="h-3 w-3" /> Tout va bien</>
                : info.statut === 'urgent' ? <><Zap className="h-3 w-3" /> Urgent</>
                : info.statut === 'action' ? <><AlertCircle className="h-3 w-3" /> Action requise</>
                : <><Circle className="h-3 w-3" /> Incomplet</>}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between gap-4 pt-0">
          <div className="space-y-1.5">
            {info.prochainCulte ? (
              <>
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-white/70 shrink-0" />
                  <span className="text-xs text-white/85 truncate">
                    {capitalize(formatDateLongue(info.prochainCulte.date))}
                  </span>
                </div>
                {info.prochainCulte.responsables.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-white/70 shrink-0" />
                    <span className="text-xs text-white/85 truncate">
                      {info.prochainCulte.responsables.join(', ')}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-white/70">Aucun culte planifié</p>
            )}
            {info.nbTaches > 0 && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-brand-gold shrink-0" />
                <span className="text-xs text-brand-gold font-medium">
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
    <Card data-module={module} className="card-hover flex flex-col h-full">
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
              <Clock className="h-3.5 w-3.5 text-warning dark:text-warning shrink-0" />
              <span className="text-xs text-warning dark:text-warning font-medium">
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

export function WidgetEquipe({ data }: { data: EquipeData }) {
  const lignes = [
    { label: 'Son',        icon: Volume2,  membres: data.son.membres,        couleur: 'text-info dark:text-info',    bg: 'bg-info/10 dark:bg-info/5'   },
    { label: 'Projection', icon: Monitor,  membres: data.projection.membres, couleur: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40' },
    { label: 'Captation',  icon: Video,    membres: data.captation.membres,  couleur: 'text-danger dark:text-danger',      bg: 'bg-danger/10 dark:bg-danger/5'    },
    { label: 'CM',         icon: Share2,   membres: data.cm.membre ? [data.cm.membre] : [], couleur: 'text-success dark:text-success', bg: 'bg-success/10 dark:bg-success/5' },
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
          <div className="flex items-center gap-2">
            {data.dateProchainCulte && (
              <span className="text-xs text-muted-foreground">
                {capitalize(formatDateCourte(data.dateProchainCulte))}
              </span>
            )}
            <Link
              href="/dashboard/planning-dimanche"
              className="text-xs font-medium text-success dark:text-success hover:underline"
            >
              Planning →
            </Link>
          </div>
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
                ? <CheckCircle2 className="h-3.5 w-3.5 text-success dark:text-success shrink-0" />
                : <AlertCircle  className="h-3.5 w-3.5 text-amber-400 dark:text-warning shrink-0" />
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
  joursAvant:   number | null
}

export function WidgetAnnonces({ data }: { data: AnnoncesWidgetData }) {
  const pct     = data.total > 0 ? Math.round((data.ok / data.total) * 100) : 0
  const urgent  = data.joursAvant !== null && data.joursAvant <= 3 && data.statutGlobal !== 'publie' && data.statutGlobal !== 'valide'
  const valide  = data.statutGlobal === 'publie' || data.statutGlobal === 'valide'

  return (
    <Card className={urgent ? 'border-danger/30 dark:border-danger/30' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Megaphone className={`h-4 w-4 ${urgent ? 'text-danger' : 'text-muted-foreground'}`} />
            Annonces
          </CardTitle>
          <div className="flex items-center gap-2">
            {data.joursAvant !== null && (
              <span className={`text-xs font-medium tabular-nums ${
                urgent ? (data.joursAvant === 0 ? 'text-danger dark:text-danger' : 'text-warning dark:text-warning')
                : 'text-muted-foreground'
              }`}>
                {data.joursAvant === 0 ? 'Aujourd\'hui' : `J-${data.joursAvant}`}
              </span>
            )}
            {data.culteDate && (
              <span className="text-xs text-muted-foreground">
                {capitalize(formatDateCourte(data.culteDate))}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {!data.culteDate ? (
          <p className="text-xs text-muted-foreground py-2">Aucun culte planifié</p>
        ) : (
          <>
            {/* Alerte urgence */}
            {urgent && (
              <div className={`flex items-start gap-2 rounded-lg px-3 py-2 ${
                data.joursAvant === 0
                  ? 'bg-danger/10 dark:bg-danger/5 border border-danger/30 dark:border-danger/30'
                  : 'bg-warning/10 dark:bg-warning/5 border border-warning/30 dark:border-warning/30'
              }`}>
                <AlertTriangle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${data.joursAvant === 0 ? 'text-danger' : 'text-warning'}`} />
                <p className={`text-xs font-medium ${data.joursAvant === 0 ? 'text-danger dark:text-danger' : 'text-warning dark:text-warning'}`}>
                  {data.joursAvant === 0
                    ? 'C\'est aujourd\'hui ! Annonce non validée'
                    : data.joursAvant === 1
                    ? 'Demain ! Annonce non validée'
                    : `Dans ${data.joursAvant} jours — Annonce non validée`
                  }
                </p>
              </div>
            )}

            {/* Statut validé */}
            {valide && (
              <div className="flex items-center gap-2 rounded-lg bg-success/10 dark:bg-success/5 border border-success/30 dark:border-success/30 px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                <p className="text-xs font-medium text-success dark:text-success">
                  {data.statutGlobal === 'publie' ? 'Annonce publiée' : 'Annonce validée'}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{data.ok} / {data.total} rubriques validées</span>
                <span className={`font-medium ${pct === 100 ? 'text-success dark:text-success' : urgent ? 'text-danger dark:text-danger' : ''}`}>
                  {pct}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct === 100 ? 'bg-emerald-500' : urgent ? 'bg-red-500' : 'bg-primary'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-success/10 dark:bg-success/5 p-2">
                <p className="text-lg font-bold text-success dark:text-success tabular-nums">{data.ok}</p>
                <p className="text-xs text-success dark:text-success leading-tight">Prêtes</p>
              </div>
              <div className="rounded-lg bg-warning/10 dark:bg-warning/5 p-2">
                <p className="text-lg font-bold text-warning dark:text-warning tabular-nums">{data.enCours}</p>
                <p className="text-xs text-warning dark:text-warning leading-tight">En cours</p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <p className="text-lg font-bold text-muted-foreground tabular-nums">{data.aFaire}</p>
                <p className="text-xs text-muted-foreground leading-tight">À faire</p>
              </div>
            </div>
            <Link href={data.annonceId ? `/annonces/${data.annonceId}/rubriques` : '/annonces'}>
              <Button
                variant="outline"
                size="sm"
                className={`w-full gap-1.5 text-xs h-8 mt-1 ${urgent ? 'border-danger/30 dark:border-danger/30 text-danger dark:text-danger hover:bg-danger/10 dark:hover:bg-danger/5' : ''}`}
              >
                <FileText className="h-3.5 w-3.5" />
                {data.annonceId ? 'Préparer les annonces' : 'Créer une annonce'}
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

export function WidgetMateriel({ data }: { data: MaterielWidgetData }) {
  const aDesAlerts = data.total > 0
  return (
    <Card className={aDesAlerts ? 'border-danger/30 dark:border-danger/30' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package2 className="h-4 w-4 text-muted-foreground" />
            Matériel en alerte
          </CardTitle>
          {aDesAlerts && (
            <Badge className="bg-danger/15 dark:bg-danger/5 text-danger dark:text-danger border-danger/30 dark:border-danger/30 hover:bg-danger/15 dark:hover:bg-danger/5 gap-1 text-xs">
              <AlertTriangle className="h-3 w-3" />
              {data.total} alerte{data.total > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {!aDesAlerts ? (
          <div className="flex items-center gap-2 py-2">
            <CheckCircle2 className="h-4 w-4 text-success dark:text-success shrink-0" />
            <p className="text-xs text-success dark:text-success font-medium">Tout le matériel est en ordre</p>
          </div>
        ) : (
          <>
            {data.horsService.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-danger dark:text-danger flex items-center gap-1 mb-1.5">
                  <AlertTriangle className="h-3 w-3" /> Hors service ({data.horsService.length})
                </p>
                {data.horsService.map((m: Row) => (
                  <div key={m.id} className="flex items-start gap-2 rounded-lg bg-danger/10 dark:bg-danger/5 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.nom}</p>
                      {(m.marque || m.modele) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[m.marque, m.modele].filter(Boolean).join(' ')}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-danger/15 dark:bg-danger/5 text-danger dark:text-danger border-danger/30 dark:border-danger/30 hover:bg-danger/15 dark:hover:bg-danger/5 text-xs shrink-0">
                      Hors service
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {data.enReparation.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-warning dark:text-warning flex items-center gap-1 mb-1.5">
                  <Wrench className="h-3 w-3" /> En réparation ({data.enReparation.length})
                </p>
                {data.enReparation.map((m: Row) => (
                  <div key={m.id} className="flex items-start gap-2 rounded-lg bg-warning/10 dark:bg-warning/5 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.nom}</p>
                      {m.description_reparation && (
                        <p className="text-xs text-muted-foreground truncate">{m.description_reparation}</p>
                      )}
                    </div>
                    <Badge className="bg-warning/15 dark:bg-warning/5 text-warning dark:text-warning border-warning/30 dark:border-warning/30 hover:bg-warning/15 dark:hover:bg-warning/5 text-xs shrink-0">
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
  facebook:  { label: 'Facebook',  icone: '📘', bg: 'bg-info/10 dark:bg-info/5'  },
  instagram: { label: 'Instagram', icone: '📸', bg: 'bg-pink-50 dark:bg-pink-950/40'  },
  whatsapp:  { label: 'WhatsApp',  icone: '💬', bg: 'bg-success/10 dark:bg-success/5' },
}

const STATUT_POST_CONFIG: Record<string, { label: string; cls: string }> = {
  a_faire:               { label: 'À faire',    cls: 'bg-muted dark:bg-muted text-foreground dark:text-muted-foreground border-border dark:border-border hover:bg-muted dark:hover:bg-muted' },
  en_creation:           { label: 'En création',cls: 'bg-warning/15 dark:bg-warning/5 text-warning dark:text-warning border-warning/30 dark:border-warning/30 hover:bg-warning/15 dark:hover:bg-warning/5' },
  en_attente_validation: { label: 'En attente', cls: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40' },
  programme:             { label: 'Programmé',  cls: 'bg-info/15 dark:bg-info/5 text-info dark:text-info border-info/30 dark:border-info/30 hover:bg-info/15 dark:hover:bg-info/5' },
  publie:                { label: 'Publié',     cls: 'bg-success/15 dark:bg-success/5 text-success dark:text-success border-success/30 dark:border-success/30 hover:bg-success/15 dark:hover:bg-success/5' },
  annule:                { label: 'Annulé',     cls: 'bg-danger/15 dark:bg-danger/5 text-danger dark:text-danger border-danger/30 dark:border-danger/30 hover:bg-danger/15 dark:hover:bg-danger/5' },
}

interface PostsCMWidgetData {
  posts:    Row[]
  lundi:    string
  dimanche: string
}

export function WidgetPostsCM({ data }: { data: PostsCMWidgetData }) {
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
    badge:      'bg-info/15 dark:bg-info/5 text-info dark:text-info border-info/30 dark:border-info/30',
    avatarBg:   'bg-blue-600',
    avatarText: 'text-white',
  },
  Captation: {
    badge:      'bg-danger/15 dark:bg-danger/5 text-danger dark:text-danger border-danger/30 dark:border-danger/30',
    avatarBg:   'bg-red-600',
    avatarText: 'text-white',
  },
  Community: {
    badge:      'bg-success/15 dark:bg-success/5 text-success dark:text-success border-success/30 dark:border-success/30',
    avatarBg:   'bg-green-600',
    avatarText: 'text-white',
  },
  Projection: {
    badge:      'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
    avatarBg:   'bg-purple-600',
    avatarText: 'text-white',
  },
  Annonces: {
    badge:      'bg-warning/15 dark:bg-warning/5 text-warning dark:text-warning border-warning/30 dark:border-warning/30',
    avatarBg:   'bg-amber-500',
    avatarText: 'text-white',
  },
}

export function SectionEquipe({ membres, isAdmin }: { membres: MembreUnifie[], isAdmin: boolean }) {
  return (
    <section id="equipe">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">Équipe</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {membres.length} membre{membres.length > 1 ? 's' : ''} actif{membres.length > 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && <AjouterMembreDialog />}
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

export function Skeleton() {
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
