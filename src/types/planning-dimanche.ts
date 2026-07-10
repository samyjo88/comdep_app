// ── Types : planning centralisé des équipes du dimanche ────────────────────

export type Departement = 'son' | 'projection' | 'captation' | 'community' | 'annonces'

export const DEPARTEMENTS: Departement[] = ['son', 'projection', 'captation', 'community', 'annonces']

export interface ConfigDepartement {
  code:    Departement
  label:   string
  table:   string
  couleur: string
  bg:      string
  border:  string
}

export const DEPARTEMENTS_CONFIG: Record<Departement, ConfigDepartement> = {
  son: {
    code: 'son', label: 'Sonorisation', table: 'membres_son',
    couleur: 'text-blue-600 dark:text-blue-400',
    bg:      'bg-blue-50 dark:bg-blue-950/40',
    border:  'border-blue-200 dark:border-blue-800',
  },
  projection: {
    code: 'projection', label: 'Projection', table: 'membres_projection',
    couleur: 'text-purple-600 dark:text-purple-400',
    bg:      'bg-purple-50 dark:bg-purple-950/40',
    border:  'border-purple-200 dark:border-purple-800',
  },
  captation: {
    code: 'captation', label: 'Captation', table: 'membres_captation',
    couleur: 'text-red-600 dark:text-red-400',
    bg:      'bg-red-50 dark:bg-red-950/40',
    border:  'border-red-200 dark:border-red-800',
  },
  community: {
    code: 'community', label: 'Community', table: 'membres_cm',
    couleur: 'text-green-600 dark:text-green-400',
    bg:      'bg-green-50 dark:bg-green-950/40',
    border:  'border-green-200 dark:border-green-800',
  },
  annonces: {
    code: 'annonces', label: 'Annonces', table: 'membres_annonces',
    couleur: 'text-amber-600 dark:text-amber-400',
    bg:      'bg-amber-50 dark:bg-amber-950/40',
    border:  'border-amber-200 dark:border-amber-800',
  },
}

export type Slot = 1 | 2

export interface AssignationDimanche {
  id:            number
  date_dimanche: string
  departement:   Departement
  slot:          Slot
  membre_id:     string
}

export interface MembreDepartement {
  id:     string
  prenom: string
  nom:    string
  actif:  boolean
}

export type MembresParDepartement = Record<Departement, MembreDepartement[]>
