import { CheckCircle2, CircleDashed, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TYPES_CULTE, type CulteProgramme } from '@/types/cultes'

export type Etat = 'ok' | 'partiel' | 'manquant'

export interface LignePreparation {
  module: 'annonces' | 'projection' | 'son' | 'captation'
  label:  string
  etat:   Etat
  detail: string
}

const STATUT_ANNONCE: Record<string, string> = {
  brouillon: 'Brouillon', valide: 'Validées', publie: 'Publiées',
}

/** État de préparation de chaque volet du culte. */
export function lignesPreparation(c: CulteProgramme): LignePreparation[] {
  const sonResp = c.son?.affectations.responsable
  const nbSon   = Object.keys(c.son?.affectations ?? {}).length
  return [
    {
      module: 'annonces', label: 'Annonces',
      etat:   !c.annonce ? 'manquant' : c.annonce.statut_global === 'brouillon' ? 'partiel' : 'ok',
      detail: c.annonce ? STATUT_ANNONCE[c.annonce.statut_global] ?? c.annonce.statut_global : 'À préparer',
    },
    {
      module: 'projection', label: 'Cantiques',
      etat:   !c.setlist || c.setlist.nbChants === 0 ? 'manquant' : c.setlist.statut === 'brouillon' ? 'partiel' : 'ok',
      detail: c.setlist ? `${c.setlist.nbChants} chant${c.setlist.nbChants > 1 ? 's' : ''}` : 'À programmer',
    },
    {
      module: 'son', label: 'Sono',
      etat:   sonResp ? 'ok' : nbSon > 0 ? 'partiel' : 'manquant',
      detail: sonResp ? sonResp.nom : 'À désigner',
    },
    {
      module: 'captation', label: 'Captation',
      etat:   c.captation.length >= 2 ? 'ok' : c.captation.length === 1 ? 'partiel' : 'manquant',
      detail: c.captation.length > 0 ? `${c.captation.length} désigné${c.captation.length > 1 ? 's' : ''}` : 'À désigner',
    },
  ]
}

const ICONE = { ok: CheckCircle2, partiel: CircleDashed, manquant: AlertTriangle }
const COULEUR = {
  ok:       'border-success/25 bg-success/10 text-success',
  partiel:  'border-warning/25 bg-warning/10 text-warning',
  manquant: 'border-danger/25 bg-danger/10 text-danger',
}

export function PuceEtat({ ligne, compact = false }: { ligne: LignePreparation; compact?: boolean }) {
  const Icone = ICONE[ligne.etat]
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium',
        COULEUR[ligne.etat],
      )}
      title={`${ligne.label} : ${ligne.detail}`}
    >
      <Icone className="h-3.5 w-3.5 shrink-0" />
      <span className="shrink-0">{ligne.label}</span>
      {!compact && <span className="truncate font-normal opacity-80">· {ligne.detail}</span>}
    </span>
  )
}

/** Pourcentage de préparation (pour la barre de progression). */
export function progression(lignes: LignePreparation[]): number {
  const points = lignes.reduce((s, l) => s + (l.etat === 'ok' ? 2 : l.etat === 'partiel' ? 1 : 0), 0)
  return Math.round((points / (lignes.length * 2)) * 100)
}

export function BadgeType({ type }: { type: CulteProgramme['type_culte'] }) {
  const cls = {
    dominical: 'bg-primary/10 text-primary border-primary/20',
    semaine:   'bg-info/10 text-info border-info/20',
    special:   'bg-gold/10 text-gold border-gold/25',
  }[type]
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', cls)}>
      {TYPES_CULTE[type].court}
    </span>
  )
}
