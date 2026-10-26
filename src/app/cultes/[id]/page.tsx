import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight, ChevronLeft, Clock, Megaphone, Mic2, Monitor, Music, Video, Volume2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCulteDetail, getEquipesDisponibles, titreCulte } from '@/lib/cultes'
import { getModulesAccessibles } from '@/lib/dashboard/modules-access'
import {
  PuceEtat, lignesPreparation, progression,
} from '@/components/cultes/EtatPreparation'
import { ROLES_CONFIG } from '@/types/captation'
import {
  ROLES_PROJECTION, ROLES_SON, TYPES_CULTE, type AffectationRole, type MembreResume,
} from '@/types/cultes'
import { BoutonPreparer, BoutonRelance, EditeurEquipe } from './ActionsCulte'

export const metadata = { title: 'Fiche du culte' }

function Volet({ module, icon: Icon, titre, etat, actions, children }: {
  module: string
  icon: typeof Volume2
  titre: string
  etat: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section data-module={module} className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-module/10 text-module ring-1 ring-module/15">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold leading-tight">{titre}</h2>
            <div className="mt-1">{etat}</div>
          </div>
        </div>
      </div>
      <div className="flex-1">{children}</div>
      {actions && <div className="flex flex-wrap gap-2 border-t pt-4">{actions}</div>}
    </section>
  )
}

function ListeAffectations({ roles, affectations }: {
  roles: { code: string; label: string }[]
  affectations: AffectationRole[] | Partial<Record<string, MembreResume>>
}) {
  const parRole = Array.isArray(affectations)
    ? Object.fromEntries(affectations.map(a => [a.role, a.membre]))
    : affectations
  return (
    <ul className="divide-y">
      {roles.map(r => {
        const m = parRole[r.code]
        return (
          <li key={r.code} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            {m ? (
              <span className="flex min-w-0 items-center gap-2 font-medium">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-module/15 text-[10px] font-bold text-module">
                  {m.nom.split(' ').map(p => p[0]).slice(0, 2).join('')}
                </span>
                <span className="truncate">{m.nom}</span>
              </span>
            ) : (
              <span className="text-xs font-medium text-danger">À désigner</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default async function CultePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [culte, equipes, modules] = await Promise.all([
    getCulteDetail(id),
    getEquipesDisponibles(),
    getModulesAccessibles(),
  ])
  if (!culte) notFound()

  const peut   = (m: string) => modules === null || modules.includes(m)
  const lignes = lignesPreparation(culte)
  const pct    = progression(lignes)
  const etat   = (label: string) => <PuceEtat ligne={lignes.find(l => l.label === label)!} />

  const rolesCaptation = ROLES_CONFIG.map(r => ({ code: r.code, label: `${r.icone} ${r.label}` }))
  const actuels = (a: AffectationRole[]) => Object.fromEntries(a.map(x => [x.role, x.membre.id]))
  const sonActuels = Object.fromEntries(
    Object.entries(culte.son?.affectations ?? {}).map(([r, m]) => [r, (m as MembreResume).id]),
  )
  const quelquUn = Object.keys(culte.son?.affectations ?? {}).length + culte.captation.length + culte.projection.length > 0

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-7 sm:px-5">
      <Link href="/cultes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />Programme des cultes
      </Link>

      {/* En-tête */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3d6b27] via-brand-green to-[#86a93b] p-6 text-white shadow-lg shadow-primary/20">
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold ring-1 ring-white/30">
                {TYPES_CULTE[culte.type_culte].label}
              </span>
              {culte.heure_debut && (
                <span className="inline-flex items-center gap-1 text-sm text-white/85">
                  <Clock className="h-3.5 w-3.5" />{titreCulte(culte).split(' à ')[1]}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold leading-tight">
              {culte.libelle || titreCulte({ date_culte: culte.date_culte, heure_debut: null })}
            </h1>
            {culte.libelle && <p className="text-white/85">{titreCulte(culte)}</p>}
            {(culte.theme || culte.predicateur) && (
              <p className="text-sm text-white/85">
                {culte.theme && <>Thème : « {culte.theme} »</>}
                {culte.theme && culte.predicateur && ' · '}
                {culte.predicateur && <span className="inline-flex items-center gap-1"><Mic2 className="h-3.5 w-3.5" />{culte.predicateur}</span>}
              </p>
            )}
          </div>
          <div className="w-full shrink-0 space-y-2 sm:w-56">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-white/80">Préparation</span>
              <span className="font-display text-2xl font-bold">{pct} %</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-brand-gold transition-all" style={{ width: `${pct}%` }} />
            </div>
            {quelquUn && (
              <BoutonRelance culteId={culte.id} modules={['son', 'captation', 'projection']} libelle="Relancer toutes les équipes" variant="default" />
            )}
          </div>
        </div>
      </div>

      <div className="stagger grid gap-4 lg:grid-cols-2">
        {/* Annonces */}
        <Volet
          module="annonces" icon={Megaphone} titre="Annonces" etat={etat('Annonces')}
          actions={peut('annonces') && (culte.annonce ? (
            <Button asChild size="sm">
              <Link href={`/annonces/${culte.annonce.id}/rubriques`}>Rédiger les annonces<ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          ) : (
            <BoutonPreparer culteId={culte.id} quoi="annonces" libelle="Préparer les annonces" />
          ))}
        >
          <p className="text-sm text-muted-foreground">
            {culte.annonce
              ? 'Les annonces de ce culte sont en préparation. Rubriques, texte lu au culte et export PDF.'
              : 'Aucune annonce n’est encore préparée pour ce culte.'}
          </p>
        </Volet>

        {/* Cantiques */}
        <Volet
          module="projection" icon={Music} titre="Cantiques programmés" etat={etat('Cantiques')}
          actions={culte.setlist ? (
            <Button asChild size="sm">
              <Link href={`/projection/setlists/${culte.setlist.id}/edit`}>Modifier la liste<ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          ) : (
            <BoutonPreparer culteId={culte.id} quoi="cantiques" libelle="Créer la liste des cantiques" />
          )}
        >
          {culte.chants.length > 0 ? (
            <ol className="space-y-1.5">
              {culte.chants.map(ch => (
                <li key={ch.position} className="flex items-center gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-module/10 font-display text-xs font-bold text-module">
                    {ch.position}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {ch.numero && <span className="mr-1 text-muted-foreground">GAD {ch.numero} ·</span>}
                    {ch.titre}
                  </span>
                  {ch.moment && <span className="shrink-0 text-xs capitalize text-muted-foreground">{ch.moment}</span>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun cantique n’est encore programmé.</p>
          )}
        </Volet>

        {/* Sonorisation */}
        <Volet
          module="son" icon={Volume2} titre="Sonorisation" etat={etat('Sono')}
          actions={peut('son') && (
            <>
              <EditeurEquipe culteId={culte.id} module="son" roles={ROLES_SON} membres={equipes.son} actuels={sonActuels} />
              {Object.keys(culte.son?.affectations ?? {}).length > 0 && (
                <BoutonRelance culteId={culte.id} modules={['son']} libelle="Relancer l'équipe son" />
              )}
            </>
          )}
        >
          <ListeAffectations roles={ROLES_SON} affectations={culte.son?.affectations ?? {}} />
          <p className="mt-3 text-xs text-muted-foreground">
            Rappel automatique 48 h avant le culte. Les responsables son sont relancés si personne n’est désigné 3 jours avant.
          </p>
        </Volet>

        {/* Captation */}
        <Volet
          module="captation" icon={Video} titre="Captation (vidéo et photo)" etat={etat('Captation')}
          actions={peut('captation') && (
            <>
              <EditeurEquipe culteId={culte.id} module="captation" roles={rolesCaptation} membres={equipes.captation} actuels={actuels(culte.captation)} filtrerParRole />
              {culte.captation.length > 0 && <BoutonRelance culteId={culte.id} modules={['captation']} libelle="Relancer" />}
              <Button asChild variant="ghost" size="sm">
                <Link href={`/captation/culte/${culte.id}`}>Médias et livrables<ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </>
          )}
        >
          <ListeAffectations roles={rolesCaptation} affectations={culte.captation} />
        </Volet>

        {/* Projection */}
        <Volet
          module="projection" icon={Monitor} titre="Projection" etat={
            <span className="text-xs text-muted-foreground">
              {culte.projection.length}/{ROLES_PROJECTION.length} opérateur{culte.projection.length > 1 ? 's' : ''} désigné{culte.projection.length > 1 ? 's' : ''}
            </span>
          }
          actions={peut('projection') && (
            <>
              <EditeurEquipe culteId={culte.id} module="projection" roles={ROLES_PROJECTION} membres={equipes.projection} actuels={actuels(culte.projection)} filtrerParRole />
              {culte.projection.length > 0 && <BoutonRelance culteId={culte.id} modules={['projection']} libelle="Relancer" />}
            </>
          )}
        >
          <ListeAffectations roles={ROLES_PROJECTION} affectations={culte.projection} />
        </Volet>
      </div>
    </div>
  )
}
