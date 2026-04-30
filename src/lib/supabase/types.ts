export type AppRole = 'super_admin' | 'admin' | 'responsable' | 'redacteur' | 'membre'
export type StatutCulte = 'planifie' | 'confirme' | 'passe'

export interface PlanningCulte {
  id: number
  date_culte: string
  responsable_id: number | null
  assistant1_id: number | null
  assistant2_id: number | null
  statut: StatutCulte
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type RoleSon = 'responsable' | 'technicien' | 'assistant'
export type PrioriteAchat = 'urgent' | 'normal' | 'faible'
export type StatutAchat   = 'en_attente' | 'approuve' | 'commande' | 'recu'

export interface MembreSon {
  id: number
  prenom: string
  nom: string
  telephone: string | null
  email: string | null
  role: RoleSon
  actif: boolean
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AchatPlanifie {
  id: number
  nom: string
  quantite: number
  budget_estime: number | null
  priorite: PrioriteAchat
  statut: StatutAchat
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
export type CategorieMateriel = 'microphone' | 'enceinte' | 'amplificateur' | 'mixette' | 'cable' | 'effet' | 'instrument' | 'accessoire' | 'autre'
export type StatutMateriel = 'disponible' | 'emprunte' | 'en_maintenance' | 'hors_service'
export type EtatMateriel = 'neuf' | 'bon' | 'use' | 'en_panne'

export interface MaterielSono {
  id: number
  nom: string
  marque: string | null
  modele: string | null
  reference: string | null
  numero_serie: string | null
  categorie: CategorieMateriel
  statut: StatutMateriel
  etat: EtatMateriel
  quantite_total: number
  quantite_disponible: number
  en_reparation: boolean
  description_reparation: string | null
  date_envoi_reparation: string | null
  dernier_nettoyage: string | null
  prochain_nettoyage: string | null
  localisation: string | null
  date_acquisition: string | null
  valeur_achat: number | null
  notes: string | null
  image_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
export type StatutPublication = 'brouillon' | 'en_revision' | 'planifie' | 'publie' | 'archive'
export type CanalDiffusion = 'site_web' | 'reseaux_sociaux' | 'email' | 'affichage' | 'bulletin' | 'autre'
export type StatutEvenement = 'planifie' | 'en_cours' | 'termine' | 'annule'
export type TypeMedia = 'image' | 'video' | 'audio' | 'document' | 'autre'

export interface Profile {
  id: string
  prenom: string
  nom: string
  email: string
  telephone: string | null
  avatar_url: string | null
  bio: string | null
  actif: boolean
  created_at: string
  updated_at: string
}

export interface UserRole {
  id: number
  user_id: string
  role: AppRole
  created_at: string
}

export interface Equipe {
  id: number
  nom: string
  description: string | null
  couleur: string
  actif: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface EquipeMembre {
  id: number
  equipe_id: number
  user_id: string
  est_chef: boolean
  created_at: string
}

export interface Categorie {
  id: number
  nom: string
  slug: string
  description: string | null
  couleur: string
  created_at: string
}

export interface Media {
  id: number
  nom: string
  description: string | null
  url: string
  type: TypeMedia
  taille_octets: number | null
  largeur_px: number | null
  hauteur_px: number | null
  mime_type: string | null
  storage_path: string | null
  uploaded_by: string | null
  created_at: string
}

export interface Publication {
  id: number
  titre: string
  slug: string
  contenu: string | null
  resume: string | null
  image_couv_id: number | null
  statut: StatutPublication
  canaux: CanalDiffusion[]
  categorie_id: number | null
  equipe_id: number | null
  auteur_id: string | null
  validateur_id: string | null
  date_publication: string | null
  date_expiration: string | null
  created_at: string
  updated_at: string
}

export interface Evenement {
  id: number
  titre: string
  description: string | null
  lieu: string | null
  date_debut: string
  date_fin: string | null
  statut: StatutEvenement
  categorie_id: number | null
  equipe_id: number | null
  image_id: number | null
  responsable_id: string | null
  est_public: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Annonce {
  id: number
  titre: string
  contenu: string
  priorite: number
  epinglee: boolean
  auteur_id: string | null
  equipe_id: number | null
  date_expiration: string | null
  created_at: string
  updated_at: string
}

type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

// Type générique de la base de données pour le client Supabase typé
export type Database = {
  public: {
    Tables: {
      profiles:        TableDef<Profile,       Omit<Profile,       'created_at' | 'updated_at'>,    Partial<Omit<Profile,       'id'>>>
      user_roles:      TableDef<UserRole,      Omit<UserRole,      'id' | 'created_at'>,            Partial<Pick<UserRole,      'role'>>>
      equipes:         TableDef<Equipe,        Omit<Equipe,        'id' | 'created_at' | 'updated_at'>, Partial<Omit<Equipe,   'id'>>>
      equipe_membres:  TableDef<EquipeMembre,  Omit<EquipeMembre,  'id' | 'created_at'>,            Partial<EquipeMembre>>
      categories:      TableDef<Categorie,     Omit<Categorie,     'id' | 'created_at'>,            Partial<Omit<Categorie,    'id'>>>
      medias:          TableDef<Media,         Omit<Media,         'id' | 'created_at'>,            Partial<Omit<Media,        'id'>>>
      publications:    TableDef<Publication,   Omit<Publication,   'id' | 'created_at' | 'updated_at'>, Partial<Omit<Publication, 'id'>>>
      evenements:      TableDef<Evenement,     Omit<Evenement,     'id' | 'created_at' | 'updated_at'>, Partial<Omit<Evenement,  'id'>>>
      annonces:        TableDef<Annonce,       Omit<Annonce,       'id' | 'created_at' | 'updated_at'>, Partial<Omit<Annonce,    'id'>>>
      materiel_sono:      TableDef<MaterielSono,    Omit<MaterielSono,    'id' | 'created_at' | 'updated_at'>, Partial<Omit<MaterielSono,    'id'>>>
      achats_planifies:   TableDef<AchatPlanifie,  Omit<AchatPlanifie,  'id' | 'created_at' | 'updated_at'>, Partial<Omit<AchatPlanifie,  'id'>>>
      membres_son:        TableDef<MembreSon,      Omit<MembreSon,      'id' | 'created_at' | 'updated_at'>, Partial<Omit<MembreSon,      'id'>>>
      planning_son:       TableDef<PlanningCulte, Omit<PlanningCulte, 'id' | 'created_at' | 'updated_at'>, Partial<Omit<PlanningCulte, 'id'>>>
    }
    Views: Record<string, never>
    Functions: {
      get_my_role: { Args: Record<never, never>; Returns: AppRole }
      has_role: { Args: { required_role: AppRole }; Returns: boolean }
    }
    Enums: {
      app_role: AppRole
      statut_publication: StatutPublication
      canal_diffusion: CanalDiffusion
      statut_evenement: StatutEvenement
      type_media: TypeMedia
      categorie_materiel: CategorieMateriel
      statut_materiel: StatutMateriel
      priorite_achat: PrioriteAchat
      statut_achat: StatutAchat
      role_son: RoleSon
      statut_culte: StatutCulte
    }
    CompositeTypes: Record<string, never>
  }
}
