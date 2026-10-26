import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getModulesAccessibles, getMyRole } from '@/lib/dashboard/modules-access'
import { Button } from '@/components/ui/button'
import {
  Church, CalendarPlus, Volume2, Monitor, Megaphone, Video, Share2, AlertTriangle,
} from 'lucide-react'
import type { Metadata } from 'next'
import { CountdownDimanche } from '@/components/dashboard/CountdownDimanche'
import { capitalize, formatDateLong as formatDateLongue } from '@/lib/utils'
import { getDashboardData } from './_lib/data'
import {
  CarteModule, WidgetEquipe, WidgetAnnonces, WidgetMateriel, WidgetPostsCM, SectionEquipe, Skeleton,
} from './_components/widgets'

export const metadata: Metadata = { title: 'Tableau de bord' }

// ── Contenu principal ──────────────────────────────────────────────────────

async function PageContent() {
  const [d, modulesAccessibles, role] = await Promise.all([
    getDashboardData(),
    getModulesAccessibles(),
    getMyRole(),
  ])
  const a = d.alerteAnnonces
  const isAdmin = role === 'super_admin' || role === 'admin'

  const canSee = (key: string) => modulesAccessibles == null || modulesAccessibles.includes(key)

  return (
    <div className="space-y-8">

      {/* Compte à rebours dimanche */}
      <CountdownDimanche
        prochainCulteDate={d.dateProchainCulte}
        nbMembresActifs={d.nbMembresActifs}
        tachesEnAttente={d.tachesEnAttente}
      />

      {/* ── Alerte annonces urgente ── */}
      {a && canSee('annonces') && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${
          a.jours === 0
            ? 'border-danger/30 dark:border-danger/30 bg-danger/10 dark:bg-danger/5'
            : 'border-warning/30 dark:border-warning/30 bg-warning/10 dark:bg-warning/5'
        }`}>
          <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${a.jours === 0 ? 'text-danger' : 'text-warning'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${a.jours === 0 ? 'text-danger dark:text-danger' : 'text-warning dark:text-warning'}`}>
              {a.jours === 0
                ? 'C\'est aujourd\'hui ! L\'annonce n\'est pas encore validée'
                : a.jours === 1
                ? 'Le culte est demain — l\'annonce n\'est pas encore validée'
                : `Le culte est dans ${a.jours} jours — l'annonce n'est pas encore validée`
              }
            </p>
            <p className={`text-xs mt-0.5 ${a.jours === 0 ? 'text-danger dark:text-danger' : 'text-warning dark:text-warning'}`}>
              {capitalize(formatDateLongue(a.culteDate))}
              {a.statutGlobal == null && ' — Aucune annonce créée'}
              {a.statutGlobal === 'brouillon' && ` — ${a.rubriquesOk}/${a.rubriquesTotal} rubriques complétées`}
            </p>
          </div>
          <Link
            href={a.annonceId ? `/annonces/${a.annonceId}/rubriques` : `/annonces/nouveau?culte=`}
            className="shrink-0"
          >
            <Button size="sm" className={`text-xs h-7 ${
              a.jours === 0
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                : 'bg-warning hover:bg-warning/90 text-white dark:text-background'
            }`}>
              {a.annonceId ? 'Compléter →' : 'Créer l\'annonce →'}
            </Button>
          </Link>
        </div>
      )}

      {/* Accès aux modules */}
      <section id="modules">
        <h2 className="text-lg font-semibold mb-4">Modules</h2>
        <div className="stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {canSee('son') && (
            <CarteModule
              icon={Volume2} label="Sonorisation" href="/sonorisation" module="son"
              info={d.sonoInfo} primary
            />
          )}
          {canSee('projection') && (
            <CarteModule
              icon={Monitor} label="Projection / Proclaim" href="/projection" module="projection"
              info={d.projInfo}
            />
          )}
          {canSee('annonces') && (
            <CarteModule
              icon={Megaphone} label="Annonces" href="/annonces" module="annonces"
              iconCls={d.annoncesInfo.statut === 'urgent' ? 'bg-danger/10 text-danger' : undefined}
              info={d.annoncesInfo}
            />
          )}
          {canSee('captation') && (
            <CarteModule
              icon={Video} label="Captation Vidéo" href="/captation" module="captation"
              info={d.captationInfo}
            />
          )}
          {canSee('community') && (
            <CarteModule
              icon={Share2} label="Community Management" href="/community" module="community"
              info={d.communityInfo}
            />
          )}
        </div>
      </section>

      {/* Liste complète de l'équipe */}
      <SectionEquipe membres={d.equipeUnifiee} isAdmin={isAdmin} />

      {/* Statistiques */}
      <section id="stats">
        <h2 className="text-lg font-semibold mb-4">Statistiques</h2>
        <div className="stagger grid grid-cols-1 md:grid-cols-2 gap-4">
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

export default async function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <div className="container mx-auto py-7 px-5 max-w-5xl space-y-2">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Horeb Cité SIR
          </p>
          <h1 className="mt-1 text-3xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Vue d&apos;ensemble du comité de communication
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline">
            <Link href="/cultes"><Church className="h-4 w-4" />Programme des cultes</Link>
          </Button>
          <Button asChild>
            <Link href="/cultes/nouveau"><CalendarPlus className="h-4 w-4" />Programmer un culte</Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
