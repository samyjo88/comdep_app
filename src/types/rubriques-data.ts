// Types structurés pour le contenu JSON de chaque rubrique (donnees_brutes)

// ── Scalaires partagés ──────────────────────────────────────────────────────

export type TypeCulte     = 'ordinaire' | 'fete' | 'journee_dedicacee'
export type TypeOuverture = 'verset' | 'chant'
export type TypeInfoLocale = 'annonce' | 'evenement' | 'rappel'

export type StructureEglise =
  | 'comite_moisson'
  | 'fimeco'
  | 'chorale'
  | 'organisation_jeunesse'
  | 'union_hommes'
  | 'union_femmes'
  | 'ecodim'
  | 'mouvement_reveil'
  | 'comite_organisation'
  | 'conseil'
  | 'ces'
  | 'comefa'

export const STRUCTURES_EGLISE: { value: StructureEglise; label: string }[] = [
  { value: 'comite_moisson',        label: 'Comité Moisson' },
  { value: 'fimeco',                label: 'FIMECO' },
  { value: 'chorale',               label: 'Chorale' },
  { value: 'organisation_jeunesse', label: 'Organisation de la Jeunesse' },
  { value: 'union_hommes',          label: 'Union des Hommes' },
  { value: 'union_femmes',          label: 'Union des Femmes' },
  { value: 'ecodim',                label: 'École du Dimanche (ECODIM)' },
  { value: 'mouvement_reveil',      label: 'Mouvement de Réveil' },
  { value: 'comite_organisation',   label: 'Comité d\'Organisation' },
  { value: 'conseil',               label: 'Conseil de l\'Église' },
  { value: 'ces',                   label: 'CES' },
  { value: 'comefa',                label: 'COMEFA' },
]

export const TYPES_CULTE: { value: TypeCulte; label: string }[] = [
  { value: 'ordinaire',         label: 'Culte ordinaire' },
  { value: 'fete',              label: 'Culte de fête' },
  { value: 'journee_dedicacee', label: 'Journée dédicacée' },
]

// ── Rubrique 1 — Salutation ─────────────────────────────────────────────────

export interface SalutationData {
  titre_responsable:   string        // ex : "Très Révérend"
  responsable_nom:     string
  responsable_prenom:  string
  texte_bienvenue:     string
  type_ouverture:      TypeOuverture // verset | chant
  texte_ouverture:     string        // texte du verset ou titre du chant
  reference_ouverture: string        // ex : "Philippiens 4.4" — si verset
  sommaire:            string[]      // rubriques à annoncer dans le sommaire
}

// ── Rubrique 2 — Culte précédent ────────────────────────────────────────────

export interface CultePrecedentData {
  // Type de culte
  type_culte:  TypeCulte
  nom_journee: string                // si journée dédicacée

  // Officiants
  president_culte:     string
  officiant_principal: string        // celui qui a prêché
  assistants:          string[]
  autres_presences:    string[]

  // Assistance
  assistance: string
  hommes:     string
  femmes:     string
  enfants:    string

  // Offrandes
  offrande_ordinaire:        string
  objet_offrande_ordinaire:  string
  offrande_speciale:         string
  objet_offrande_speciale:   string
  dime:                      string
  offrande_ecodim:           string

  // Méditation
  theme_predication: string
  textes_bibliques:  string[]        // jusqu'à 3 références
  verset_meditation: string          // legacy — repris dans textes_bibliques

  // Louange
  chorale_principale:      string
  groupes_supplementaires: string[]
  animation_louange:       string    // legacy — repris dans chorale_principale

  autres_informations: string
}

// ── Rubrique 3 — Culte du jour ──────────────────────────────────────────────

export interface CulteJourData {
  heure_debut: string
  type_culte:  TypeCulte
  nom_journee: string

  // Officiants
  president_culte:  string
  predicateur:      string           // officiant principal
  assistants:       string[]
  autres_presences: string[]

  theme_predication: string

  // Louange
  chorale_principale:      string
  groupes_supplementaires: string[]
  animation_louange:       string    // legacy — repris dans chorale_principale

  // Offrandes prévues
  offrande_ordinaire_prevue: boolean
  offrande_speciale_prevue:  boolean
  offrande_speciale_objet:   string

  evenement_special: string
}

// ── Rubriques 4-6 — Informations externes (conférence / district / circuit) ─

export interface EvenementItem {
  titre:         string
  date:          string
  heure_debut:   string
  heure_fin:     string
  lieu:          string
  consignes:     string              // une consigne par ligne
  date_fin:      string              // fin de validité de l'annonce
  reconductible: boolean
}

export interface CourierItem {
  objet:   string
  contenu: string                    // contenu brut — l'IA en fait le résumé
}

export interface ConferenceData {
  evenements: EvenementItem[]
  notes:      string
}

export interface DistrictData {
  evenements:       EvenementItem[]
  notes_evenements: string
  courriers:        CourierItem[]
  notes_courriers:  string
}

export interface CircuitData {
  evenements:       EvenementItem[]
  notes_evenements: string
  courriers:        CourierItem[]
  notes_courriers:  string
}

// ── Rubrique 7 — Église locale ──────────────────────────────────────────────

export interface InfoLocaleItem {
  structure:       StructureEglise | ''
  type:            TypeInfoLocale
  contenu:         string            // si annonce ou rappel
  evenement_nom:   string
  evenement_date:  string
  evenement_heure: string
  evenement_lieu:  string
  consignes:       string            // une consigne par ligne
  date_fin:        string
  reconductible:   boolean
}

export interface EvenementLocalItem {
  titre: string
  date:  string
}

export interface EgliseLocaleData {
  infos:             InfoLocaleItem[]      // informations par structure
  annonces_internes: string
  evenements:        EvenementLocalItem[]  // legacy — préférer infos
  appel_dons:        string
}

// Union pour un accès générique
export type RubriqueData =
  | SalutationData
  | CultePrecedentData
  | CulteJourData
  | ConferenceData
  | DistrictData
  | CircuitData
  | EgliseLocaleData

// ── Valeurs par défaut ──────────────────────────────────────────────────────

export const DEFAULT_SALUTATION: SalutationData = {
  titre_responsable:   '',
  responsable_nom:     '',
  responsable_prenom:  '',
  texte_bienvenue:     '',
  type_ouverture:      'verset',
  texte_ouverture:     '',
  reference_ouverture: '',
  sommaire:            [],
}

export const DEFAULT_CULTE_PRECEDENT: CultePrecedentData = {
  type_culte:  'ordinaire',
  nom_journee: '',

  president_culte:     '',
  officiant_principal: '',
  assistants:          [],
  autres_presences:    [],

  assistance: '',
  hommes:     '',
  femmes:     '',
  enfants:    '',

  offrande_ordinaire:       '',
  objet_offrande_ordinaire: '',
  offrande_speciale:        '',
  objet_offrande_speciale:  '',
  dime:                     '',
  offrande_ecodim:          '',

  theme_predication: '',
  textes_bibliques:  [],
  verset_meditation: '',

  chorale_principale:      '',
  groupes_supplementaires: [],
  animation_louange:       '',

  autres_informations: '',
}

export const DEFAULT_CULTE_JOUR: CulteJourData = {
  heure_debut: '09:00',
  type_culte:  'ordinaire',
  nom_journee: '',

  president_culte:  '',
  predicateur:      '',
  assistants:       [],
  autres_presences: [],

  theme_predication: '',

  chorale_principale:      '',
  groupes_supplementaires: [],
  animation_louange:       '',

  offrande_ordinaire_prevue: true,
  offrande_speciale_prevue:  false,
  offrande_speciale_objet:   '',

  evenement_special: '',
}

export const DEFAULT_EVENEMENT: EvenementItem = {
  titre:         '',
  date:          '',
  heure_debut:   '',
  heure_fin:     '',
  lieu:          '',
  consignes:     '',
  date_fin:      '',
  reconductible: false,
}

export const DEFAULT_INFO_LOCALE: InfoLocaleItem = {
  structure:       '',
  type:            'annonce',
  contenu:         '',
  evenement_nom:   '',
  evenement_date:  '',
  evenement_heure: '',
  evenement_lieu:  '',
  consignes:       '',
  date_fin:        '',
  reconductible:   false,
}

export const DEFAULT_CONFERENCE: ConferenceData = {
  evenements: [],
  notes:      '',
}

export const DEFAULT_DISTRICT: DistrictData = {
  evenements:       [],
  notes_evenements: '',
  courriers:        [],
  notes_courriers:  '',
}

export const DEFAULT_CIRCUIT: CircuitData = {
  evenements:       [],
  notes_evenements: '',
  courriers:        [],
  notes_courriers:  '',
}

export const DEFAULT_EGLISE_LOCALE: EgliseLocaleData = {
  infos:             [],
  annonces_internes: '',
  evenements:        [],
  appel_dons:        '',
}
