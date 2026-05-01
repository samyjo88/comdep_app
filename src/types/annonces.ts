// ── Scalaires ──────────────────────────────────────────────────────────────

export type CodeRubrique =
  | 'salutation'
  | 'culte_precedent'
  | 'culte_jour'
  | 'conference'
  | 'district'
  | 'circuit'
  | 'eglise_local'

export type StatutReconduite = 'oui' | 'non' | 'modifier' | 'a_definir'

export type StatutCulteAnnonce = 'a_venir' | 'passe'

export type StatutAnnonce = 'brouillon' | 'valide' | 'publie'

// ── Interfaces Supabase ────────────────────────────────────────────────────

export interface Culte {
  id:          string
  date_culte:  string        // ISO date 'YYYY-MM-DD'
  theme:       string | null
  predicateur: string | null
  statut:      StatutCulteAnnonce
  created_at:  string
}

export interface Annonce {
  id:            string
  culte_id:      string
  statut_global: StatutAnnonce
  created_at:    string
  updated_at:    string
}

export interface RubriqueAnnonce {
  id:             string
  annonce_id:     string
  code_rubrique:  CodeRubrique
  ordre:          number | null
  donnees_brutes: string | null   // saisie utilisateur → prompt IA
  texte_genere:   string | null   // sortie brute de l'IA
  texte_final:    string | null   // version éditée et validée
  reconduire:     StatutReconduite
  date_validite:  string | null   // ISO date
  genere_le:      string | null   // ISO timestamptz
  valide:         boolean
}

export interface HistoriqueGeneration {
  id:              string
  rubrique_id:     string | null
  prompt_envoye:   string | null
  texte_recu:      string | null
  tokens_utilises: number | null
  created_at:      string
}

// ── Vues enrichies (avec jointures) ───────────────────────────────────────

export interface AnnonceAvecRubriques extends Annonce {
  rubriques_annonce: RubriqueAnnonce[]
}

export interface CulteAvecAnnonce extends Culte {
  annonces: AnnonceAvecRubriques[]
}

// ── Configuration des rubriques ────────────────────────────────────────────

export interface ConfigRubrique {
  code:         CodeRubrique
  ordre:        number
  label:        string
  description:  string
  icone:        string
  /** Clés attendues dans le champ donnees_brutes (guide pour l'UI et l'IA) */
  champsRequis: string[]
}

export const RUBRIQUES_CONFIG: ConfigRubrique[] = [
  {
    code:        'salutation',
    ordre:       1,
    label:       'Salutation',
    description: 'Message d\'ouverture et de bienvenue à l\'assemblée',
    icone:       '👋',
    champsRequis: [],
  },
  {
    code:        'culte_precedent',
    ordre:       2,
    label:       'Culte précédent',
    description: 'Récapitulatif du culte de la semaine passée',
    icone:       '📖',
    champsRequis: ['theme', 'predicateur', 'points_cles', 'presence'],
  },
  {
    code:        'culte_jour',
    ordre:       3,
    label:       'Culte du jour',
    description: 'Programme et intervenants du culte en cours',
    icone:       '🎙️',
    champsRequis: ['theme', 'predicateur', 'heure', 'lieu', 'programme'],
  },
  {
    code:        'conference',
    ordre:       4,
    label:       'Conférence',
    description: 'Annonces relatives aux conférences à venir',
    icone:       '🏛️',
    champsRequis: ['titre', 'orateur', 'date', 'lieu', 'details'],
  },
  {
    code:        'district',
    ordre:       5,
    label:       'District',
    description: 'Nouvelles et annonces au niveau du district',
    icone:       '🗺️',
    champsRequis: ['nouvelles', 'evenements', 'dates'],
  },
  {
    code:        'circuit',
    ordre:       6,
    label:       'Circuit',
    description: 'Nouvelles et annonces au niveau du circuit',
    icone:       '🔗',
    champsRequis: ['nouvelles', 'evenements', 'dates'],
  },
  {
    code:        'eglise_local',
    ordre:       7,
    label:       'Église locale',
    description: 'Annonces internes, prières et informations pratiques',
    icone:       '⛪',
    champsRequis: ['annonces', 'priere', 'informations_pratiques'],
  },
]

/** Map code → config pour un accès O(1) */
export const RUBRIQUES_BY_CODE: Record<CodeRubrique, ConfigRubrique> =
  Object.fromEntries(
    RUBRIQUES_CONFIG.map(r => [r.code, r]),
  ) as Record<CodeRubrique, ConfigRubrique>
