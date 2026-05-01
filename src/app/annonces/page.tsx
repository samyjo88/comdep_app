import { Suspense } from 'react'
import Link from 'next/link'
import { getCultes } from '@/lib/annonces'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  PlusCircle, CalendarDays, ChevronRight,
  Clock, CheckCircle2, Send, FileText,
} from 'lucide-react'
import type { Metadata } from 'next'
import type { CulteAvecAnnonce } from '@/lib/annonces'

export const metadata: Metadata = { title: 'Tableau de bord' }

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

function joursRestants(dateStr: string): number {
  const cible = new Date(dateStr + 'T00:00:00').getTime()
  const auj   = new Date(new Date().toDateString()).getTime()
  return Math.round((cible - auj) / (1000 * 60 * 60 * 24))
}

function rubriquesCompletes(culte: CulteAvecAnnonce): { completes: number; total: number } {
  const annonce = culte.annonces?.[0]
  if (!annonce) return { completes: 0, total: 7 }
  const rubriques = annonce.rubriques_annonce ?? []
  return {
    completes: rubriques.filter(r => r.valide).length,
    total:     7,
  }
}

function statutAnnonce(culte: CulteAvecAnnonce): 'aucune' | 'brouillon' | 'valide' | 'publie' {
  const annonce = culte.annonces?.[0]
  if (!annonce) return 'aucune'
  return annonce.statut_global
}

// ── Badge statut ───────────────────────────────────────────────────────────

function BadgeStatut({ statut }: { statut: ReturnType<typeof statutAnnonce> }) {
  switch (statut) {
    case 'publie':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1 text-xs">
          <Send className="h-3 w-3" /> Publié
        </Badge>
      )
    case 'valide':
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 gap-1 text-xs">
          <CheckCircle2 className="h-3 w-3" /> Validé
        </Badge>
      )
    case 'brouillon':
      return (
        <Badge variant="outline" className="text-xs gap-1">
          <FileText className="h-3 w-3" /> Brouillon
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Sans annonce
        </Badge>
      )
  }
}

// ── Données ────────────────────────────────────────────────────────────────

async function getDashboardData() {
  const { data: cultes } = await getCultes()
  if (!cultes) return { derniers: [], prochain: null }

  const today = new Date().toDateString()
  const todayMs = new Date(today).getTime()

  // Cultes à venir (date >= aujourd'hui, triés ascendant)
  const aVenir = cultes
    .filter(c => new Date(c.date_culte + 'T00:00:00').getTime() >= todayMs)
    .sort((a, b) => a.date_culte.localeCompare(b.date_culte))

  // 5 cultes les plus récents (passés + à venir, triés desc) pour la section "Derniers cultes"
  const derniers = cultes.slice(0, 5)

  return {
    derniers: derniers as CulteAvecAnnonce[],
    prochain: (aVenir[0] ?? null) as CulteAvecAnnonce | null,
  }
}

// ── Carte culte ────────────────────────────────────────────────────────────

function CarteCulte({ culte }: { culte: CulteAvecAnnonce }) {
  const statut = statutAnnonce(culte)
  const { completes, total } = rubriquesCompletes(culte)
  const progression = completes / total
  const btnLabel = statut === 'aucune' || statut === 'brouillon' ? 'Reprendre' : 'Consulter'
  const href = statut === 'aucune'
    ? `/annonces/nouveau?culte=${culte.id}`
    : `/annonces/historique/${culte.annonces?.[0]?.id ?? ''}`

  return (
    <Card className="transition-all duration-200 hover:shadow-md hover:border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-sm font-semibold leading-tight truncate">
              {capitalize(formatDateLongue(culte.date_culte))}
            </p>
            {culte.theme && (
              <p className="text-xs text-muted-foreground truncate">{culte.theme}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <BadgeStatut statut={statut} />
              {statut !== 'aucune' && (
                <span className="text-xs text-muted-foreground">
                  {completes}/{total} rubriques
                </span>
              )}
            </div>
            {/* Barre de progression */}
            {statut !== 'aucune' && (
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.round(progression * 100)}%` }}
                />
              </div>
            )}
          </div>
          <Link href={href}>
            <Button
              variant={statut === 'aucune' || statut === 'brouillon' ? 'default' : 'outline'}
              size="sm"
              className="shrink-0 text-xs h-8"
            >
              {btnLabel}
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Compte à rebours ───────────────────────────────────────────────────────

function CompteARebours({ culte }: { culte: CulteAvecAnnonce }) {
  const jours = joursRestants(culte.date_culte)
  const statut = statutAnnonce(culte)
  const { completes, total } = rubriquesCompletes(culte)

  const couleur =
    jours <= 2 ? 'border-red-200 bg-red-50'    :
    jours <= 5 ? 'border-amber-200 bg-amber-50' :
                 'border-emerald-200 bg-emerald-50'

  const couleurTexte =
    jours <= 2 ? 'text-red-700'    :
    jours <= 5 ? 'text-amber-700'  :
                 'text-emerald-700'

  return (
    <Card className={`border-2 ${couleur}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Prochain culte
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-3">
          <div>
            <p className={`text-5xl font-extrabold tabular-nums ${couleurTexte}`}>
              {jours === 0 ? "Auj." : jours}
            </p>
            {jours !== 0 && (
              <p className={`text-sm font-medium ${couleurTexte}`}>
                jour{jours > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="pb-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">
              {capitalize(formatDateLongue(culte.date_culte))}
            </p>
            {culte.theme && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{culte.theme}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {statut === 'aucune'
              ? 'Aucune annonce préparée'
              : `${completes}/${total} rubriques complétées`}
          </span>
          <BadgeStatut statut={statut} />
        </div>

        {statut !== 'aucune' && (
          <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round((completes / total) * 100)}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Contenu principal ──────────────────────────────────────────────────────

async function PageContent() {
  const { derniers, prochain } = await getDashboardData()

  return (
    <div className="space-y-8">

      {/* CTA principal */}
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 py-10 px-4 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <PlusCircle className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold mb-1">Préparer les annonces</h2>
        <p className="text-sm text-muted-foreground mb-5 max-w-xs">
          Créez ou reprenez la fiche d&apos;annonces pour le prochain culte en quelques minutes.
        </p>
        <Link href="/annonces/nouveau">
          <Button size="lg" className="gap-2 shadow-sm px-8">
            <PlusCircle className="h-5 w-5" />
            Préparer les annonces du prochain culte
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Colonne gauche : derniers cultes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Derniers cultes
            </h2>
            <Link href="/annonces/historique">
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                Voir tout <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {derniers.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Aucun culte enregistré pour l&apos;instant.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {derniers.map(c => (
                <CarteCulte key={c.id} culte={c} />
              ))}
            </div>
          )}
        </div>

        {/* Colonne droite : à venir */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            À venir
          </h2>

          {prochain ? (
            <CompteARebours culte={prochain} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Aucun culte planifié à venir.
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-48 rounded-2xl bg-muted" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 rounded-xl bg-muted" />)}
        </div>
        <div className="h-48 rounded-xl bg-muted" />
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AnnoncesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Gérez les fiches d&apos;annonces pour chaque culte
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
