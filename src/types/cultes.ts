export type TypeCulte = 'dominical' | 'semaine' | 'special'

export const TYPES_CULTE: Record<TypeCulte, { label: string; court: string }> = {
  dominical: { label: 'Culte dominical',  court: 'Dimanche' },
  semaine:   { label: 'Culte de semaine', court: 'Semaine' },
  special:   { label: 'Culte spécial',    court: 'Spécial' },
}

export type RoleSon = 'responsable' | 'assistant1' | 'assistant2'

export const ROLES_SON: { code: RoleSon; label: string }[] = [
  { code: 'responsable', label: 'Responsable son' },
  { code: 'assistant1',  label: 'Assistant 1' },
  { code: 'assistant2',  label: 'Assistant 2' },
]

export type RoleProjection = 'operateur_diffusion' | 'operateur_proclaim'

export const ROLES_PROJECTION: { code: RoleProjection; label: string }[] = [
  { code: 'operateur_proclaim',  label: 'Opérateur Proclaim' },
  { code: 'operateur_diffusion', label: 'Opérateur diffusion' },
]

export interface MembreResume {
  id:     string
  nom:    string          // « Prénom Nom »
  email:  string | null
}

export interface AffectationRole {
  role:   string
  membre: MembreResume
}

/** Un culte programmé et l'état de sa préparation dans chaque module. */
export interface CulteProgramme {
  id:          string
  date_culte:  string
  heure_debut: string | null
  type_culte:  TypeCulte
  libelle:     string | null
  theme:       string | null
  predicateur: string | null
  annonce:     { id: string; statut_global: string } | null
  setlist:     { id: string; statut: string; nbChants: number } | null
  son:         { id: number; affectations: Partial<Record<RoleSon, MembreResume>> } | null
  captation:   AffectationRole[]
  projection:  AffectationRole[]
}

/** Type proposé par défaut selon le jour : dimanche → dominical, sinon semaine. */
export function typeParDefaut(dateIso: string): TypeCulte {
  return new Date(dateIso + 'T00:00:00').getDay() === 0 ? 'dominical' : 'semaine'
}

/** « 18:30:00 » → « 18h30 » */
export function formatHeure(heure: string | null): string | null {
  if (!heure) return null
  const [h, m] = heure.split(':')
  return `${Number(h)}h${m}`
}
