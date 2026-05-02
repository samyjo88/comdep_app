// ── Scalaires ──────────────────────────────────────────────────────────────

export type RoleCaptation = 'cameraman' | 'photographe' | 'infographiste'

export type StatutPlanning = 'planifie' | 'confirme' | 'present' | 'absent'

export type StatutLivraison = 'a_faire' | 'en_cours' | 'livre' | 'valide'

export type TypeLivrable =
  | 'video_brute'
  | 'video_montee'
  | 'photos_selectionnees'
  | 'visuel_reseaux'
  | 'autre'

// ── Interfaces Supabase ────────────────────────────────────────────────────

export interface MembreCaptation {
  id:         string
  nom:        string
  prenom:     string
  telephone:  string | null
  email:      string | null
  roles:      RoleCaptation[]
  actif:      boolean
  notes:      string | null
  created_at: string
}

export interface PlanningCaptation {
  id:           string
  culte_id:     string
  membre_id:    string
  role_du_jour: RoleCaptation
  statut:       StatutPlanning
  notes:        string | null
  created_at:   string
}

export interface DossierDrive {
  id:                     string
  culte_id:               string
  lien_dossier_principal: string | null
  lien_videos:            string | null
  lien_photos:            string | null
  lien_infographie:       string | null
  id_dossier_drive:       string | null
  espace_utilise_mb:      number | null
  nb_fichiers:            number | null
  derniere_synchro:       string | null
  created_at:             string
}

export interface LivraisonCaptation {
  id:            string
  culte_id:      string
  type_livrable: TypeLivrable
  nom_fichier:   string | null
  lien_drive:    string | null
  statut:        StatutLivraison
  assignee_id:   string | null
  date_limite:   string | null   // ISO date 'YYYY-MM-DD'
  notes:         string | null
  created_at:    string
}

// ── Vues enrichies (avec jointures) ───────────────────────────────────────

export interface PlanningAvecMembre extends PlanningCaptation {
  membres_captation: MembreCaptation
}

export interface PlanningCulteComplet {
  culte:         import('@/types/annonces').Culte
  assignments:   PlanningAvecMembre[]
  dossier_drive: DossierDrive | null
  livraisons:    LivraisonCaptation[]
}

export interface StatistiquesEquipe {
  nb_cultes_couverts: number
  roles_joues:        { role: RoleCaptation; nb: number }[]
}

// ── Stats équipe (tableau participation) ──────────────────────────────────

export type StatsParMembre = Record<string, {
  cameraman:     number
  photographe:   number
  infographiste: number
  total:         number
}>

// ── Configuration des rôles ────────────────────────────────────────────────

export interface ConfigRole {
  code:    RoleCaptation
  label:   string
  icone:   string
  couleur: string
}

export const ROLES_CONFIG: ConfigRole[] = [
  {
    code:    'cameraman',
    label:   'Caméraman',
    icone:   '🎥',
    couleur: 'blue',
  },
  {
    code:    'photographe',
    label:   'Photographe',
    icone:   '📷',
    couleur: 'purple',
  },
  {
    code:    'infographiste',
    label:   'Infographiste',
    icone:   '🎨',
    couleur: 'orange',
  },
]

/** Map code → config pour un accès O(1) */
export const ROLES_BY_CODE: Record<RoleCaptation, ConfigRole> =
  Object.fromEntries(
    ROLES_CONFIG.map(r => [r.code, r]),
  ) as Record<RoleCaptation, ConfigRole>
