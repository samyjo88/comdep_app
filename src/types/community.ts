// ── Scalaires ────────────────────────────────────────────────────────────────

export type Plateforme =
  | 'facebook'
  | 'instagram'
  | 'whatsapp'
  | 'youtube'
  | 'twitter'
  | 'tiktok'

export type TypeContenu =
  | 'photo'
  | 'video'
  | 'reel'
  | 'story'
  | 'texte'
  | 'annonce'
  | 'citation'
  | 'evenement'

export type StatutPost =
  | 'a_faire'
  | 'en_creation'
  | 'en_attente_validation'
  | 'programme'
  | 'publie'
  | 'annule'

export type StatutPlanning = 'planifie' | 'confirme' | 'termine'

export type PrioritéIdee = 'urgente' | 'haute' | 'normale' | 'basse'

export type StatutIdee = 'idee' | 'approuvee' | 'utilisee'

// ── Interfaces Supabase ───────────────────────────────────────────────────────

export interface MembreCM {
  id:          string
  nom:         string
  prenom:      string
  telephone:   string | null
  email:       string | null
  specialites: string[]
  plateformes: string[]
  actif:       boolean
  notes:       string | null
  created_at:  string
}

export interface PlanningCM {
  id:            string
  semaine_debut: string   // 'YYYY-MM-DD', lundi de la semaine
  membre_id:     string | null
  statut:        StatutPlanning
  notes:         string | null
  created_at:    string
}

export interface Post {
  id:                       string
  semaine_planning_id:      string | null
  culte_id:                 string | null
  plateforme:               Plateforme
  type_contenu:             TypeContenu
  titre:                    string | null
  description:              string | null
  lien_media:               string | null
  date_publication_prevue:  string | null
  date_publication_reelle:  string | null
  statut:                   StatutPost
  assignee_id:              string | null
  url_post_publie:          string | null
  nb_likes:                 number | null
  nb_commentaires:          number | null
  nb_partages:              number | null
  nb_vues:                  number | null
  notes:                    string | null
  created_at:               string
  updated_at:               string
}

export interface RapportCM {
  id:            string
  semaine_debut: string
  contenu_json:  Record<string, unknown> | null
  resume_texte:  string | null
  genere_le:     string | null
  genere_par:    string | null
  created_at:    string
}

export interface IdeaContenu {
  id:           string
  titre:        string
  description:  string | null
  plateforme:   string[]
  type_contenu: string | null
  priorite:     PrioritéIdee
  statut:       StatutIdee
  proposee_par: string | null
  created_at:   string
}

// ── Vues enrichies ────────────────────────────────────────────────────────────

export interface PlanningAvecMembre extends PlanningCM {
  membres_cm: MembreCM | null
}

export interface PlanningWeekComplet {
  planning: PlanningCM
  membre:   MembreCM | null
  posts:    Post[]
}

// ── Stats hebdo ───────────────────────────────────────────────────────────────

export interface StatsHebdo {
  total:          number
  publies:        number
  en_attente:     number
  annules:        number
  par_plateforme: Record<Plateforme, number>
}

// ── Configuration des plateformes ─────────────────────────────────────────────

export interface ConfigPlateforme {
  code:      Plateforme
  label:     string
  icone:     string
  couleur:   string
  couleurBg: string
}

export const PLATEFORMES_CONFIG: ConfigPlateforme[] = [
  {
    code:      'facebook',
    label:     'Facebook',
    icone:     '📘',
    couleur:   '#1877F2',
    couleurBg: '#E7F0FD',
  },
  {
    code:      'instagram',
    label:     'Instagram',
    icone:     '📸',
    couleur:   '#E1306C',
    couleurBg: '#FDE8F0',
  },
  {
    code:      'whatsapp',
    label:     'WhatsApp',
    icone:     '💬',
    couleur:   '#25D366',
    couleurBg: '#E8F9EE',
  },
  {
    code:      'youtube',
    label:     'YouTube',
    icone:     '▶️',
    couleur:   '#FF0000',
    couleurBg: '#FFE8E8',
  },
  {
    code:      'twitter',
    label:     'Twitter / X',
    icone:     '🐦',
    couleur:   '#1DA1F2',
    couleurBg: '#E8F5FD',
  },
  {
    code:      'tiktok',
    label:     'TikTok',
    icone:     '🎵',
    couleur:   '#000000',
    couleurBg: '#F0F0F0',
  },
]

/** Map code → config pour un accès O(1) */
export const PLATEFORMES_BY_CODE: Record<Plateforme, ConfigPlateforme> =
  Object.fromEntries(
    PLATEFORMES_CONFIG.map(p => [p.code, p]),
  ) as Record<Plateforme, ConfigPlateforme>

// ── Configuration du pipeline Kanban ─────────────────────────────────────────

export interface ConfigStatutPost {
  code:    StatutPost
  label:   string
  couleur: string
  ordre:   number
}

export const STATUTS_POST: ConfigStatutPost[] = [
  { code: 'a_faire',               label: 'À faire',             couleur: '#94A3B8', ordre: 1 },
  { code: 'en_creation',           label: 'En création',         couleur: '#F59E0B', ordre: 2 },
  { code: 'en_attente_validation', label: 'En attente valid.',   couleur: '#8B5CF6', ordre: 3 },
  { code: 'programme',             label: 'Programmé',           couleur: '#3B82F6', ordre: 4 },
  { code: 'publie',                label: 'Publié',              couleur: '#10B981', ordre: 5 },
  { code: 'annule',                label: 'Annulé',              couleur: '#EF4444', ordre: 6 },
]

export const STATUTS_POST_BY_CODE: Record<StatutPost, ConfigStatutPost> =
  Object.fromEntries(
    STATUTS_POST.map(s => [s.code, s]),
  ) as Record<StatutPost, ConfigStatutPost>
