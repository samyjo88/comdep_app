// Types structurés pour le contenu JSON de chaque rubrique (donnees_brutes)

export interface SalutationData {
  responsable_nom:    string
  responsable_prenom: string
  texte_bienvenue:    string
  verset_jour:        string
  cantique_jour:      string
}

export interface CultePrecedentData {
  assistance:              string
  hommes:                  string
  femmes:                  string
  enfants:                 string
  offrande_ordinaire:      string
  offrande_speciale:       string
  objet_offrande_speciale: string
  dime:                    string
  offrande_ecodim:         string
  theme_predication:       string
  verset_meditation:       string
  animation_louange:       string
  autres_informations:     string
}

export interface CulteJourData {
  heure_debut:      string
  theme_predication: string
  predicateur:      string
  animation_louange: string
  evenement_special: string
}

export interface EvenementItem {
  titre: string
  date:  string
  lieu:  string
}

export interface CourierItem {
  objet:   string
  contenu: string
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

export interface EvenementLocalItem {
  titre: string
  date:  string
}

export interface EgliseLocaleData {
  annonces_internes: string
  evenements:        EvenementLocalItem[]
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

// Valeurs par défaut
export const DEFAULT_SALUTATION: SalutationData = {
  responsable_nom:    '',
  responsable_prenom: '',
  texte_bienvenue:    '',
  verset_jour:        '',
  cantique_jour:      '',
}

export const DEFAULT_CULTE_PRECEDENT: CultePrecedentData = {
  assistance:              '',
  hommes:                  '',
  femmes:                  '',
  enfants:                 '',
  offrande_ordinaire:      '',
  offrande_speciale:       '',
  objet_offrande_speciale: '',
  dime:                    '',
  offrande_ecodim:         '',
  theme_predication:       '',
  verset_meditation:       '',
  animation_louange:       '',
  autres_informations:     '',
}

export const DEFAULT_CULTE_JOUR: CulteJourData = {
  heure_debut:       '09:00',
  theme_predication: '',
  predicateur:       '',
  animation_louange: '',
  evenement_special: '',
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
  annonces_internes: '',
  evenements:        [],
  appel_dons:        '',
}
