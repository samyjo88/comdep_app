import Link from 'next/link'
import { CalendarPlus, Church, ChevronRight, Clock, Mic2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getProgrammeCultes } from '@/lib/cultes'
import { capitalize } from '@/lib/utils'
import { formatHeure, type CulteProgramme } from '@/types/cultes'
import {
  BadgeType, PuceEtat, lignesPreparation, progression,
} from '@/components/cultes/EtatPreparation'

export const metadata = { title: 'Programme des cultes' }

function joursAvant(date: string): number {
  const auj = new Date(new Date().toDateString())
  return Math.round((new Date(date + 'T00:00:00').getTime() - auj.getTime()) / 86_400_000)
}

function Echeance({ date }: { date: string }) {
  const j = joursAvant(date)
  const texte = j === 0 ? "Aujourd'hui" : j === 1 ? 'Demain' : `Dans ${j} jours`
  return (
    <span className={j <= 1 ? 'font-semibold text-danger' : j <= 3 ? 'font-semibold text-warning' : 'text-muted-foreground'}>
      {texte}
    </span>
  )
}

function CarteCulte({ c }: { c: CulteProgramme }) {
  const lignes = lignesPreparation(c)
  const pct    = progression(lignes)
  const d      = new Date(c.date_culte + 'T00:00:00')
  return (
    <Link
      href={`/cultes/${c.id}`}
      className="card-hover group flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:p-5"
    >
      {/* Date */}
      <div className="flex shrink-0 items-center gap-4 sm:w-56">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
          <span className="font-display text-[11px] font-semibold uppercase">
            {d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
          </span>
          <span className="font-display text-2xl font-bold leading-none">{d.getDate()}</span>
          <span className="text-[10px] uppercase">
            {d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}
          </span>
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <BadgeType type={c.type_culte} />
            {c.heure_debut && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />{formatHeure(c.heure_debut)}
              </span>
            )}
          </div>
          <p className="truncate font-display font-semibold">
            {c.libelle || capitalize(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}
          </p>
          <p className="text-xs"><Echeance date={c.date_culte} /></p>
        </div>
      </div>

      {/* Thème et préparation */}
      <div className="min-w-0 flex-1 space-y-3">
        {(c.theme || c.predicateur) && (
          <p className="truncate text-sm text-muted-foreground">
            {c.theme && <span className="text-foreground">« {c.theme} »</span>}
            {c.theme && c.predicateur && ' · '}
            {c.predicateur && <span className="inline-flex items-center gap-1"><Mic2 className="h-3 w-3" />{c.predicateur}</span>}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {lignes.map(l => <PuceEtat key={l.label} ligne={l} />)}
        </div>
      </div>

      {/* Progression */}
      <div className="flex shrink-0 items-center gap-3 sm:w-36 sm:flex-col sm:items-end">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted sm:w-full sm:flex-none">
          <div
            className={pct === 100 ? 'h-full bg-success' : pct >= 50 ? 'h-full bg-warning' : 'h-full bg-danger'}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          Prêt à {pct} %
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

export default async function ProgrammeCultesPage() {
  const cultes = await getProgrammeCultes()

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-7 sm:px-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Horeb Cité SIR
          </p>
          <h1 className="mt-1 text-3xl font-bold">Programme des cultes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dimanches, cultes de semaine et cultes spéciaux : annonces, cantiques, sono et captation au même endroit.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link href="/cultes/nouveau"><CalendarPlus className="h-4 w-4" />Programmer un culte</Link>
        </Button>
      </div>

      {cultes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Church className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold">Aucun culte programmé</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Programmez le prochain dimanche ou un culte en semaine : chaque équipe sera prévenue.
          </p>
          <Button asChild className="mt-2">
            <Link href="/cultes/nouveau"><CalendarPlus className="h-4 w-4" />Programmer un culte</Link>
          </Button>
        </div>
      ) : (
        <div className="stagger space-y-3">
          {cultes.map(c => <CarteCulte key={c.id} c={c} />)}
        </div>
      )}
    </div>
  )
}
