export type AppRole = 'super_admin' | 'admin' | 'responsable' | 'redacteur' | 'membre'
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

// Type générique de la base de données pour le client Supabase typé
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Omit<Profile, 'id'>> }
      user_roles: { Row: UserRole; Insert: Omit<UserRole, 'id' | 'created_at'>; Update: Partial<Pick<UserRole, 'role'>> }
      equipes: { Row: Equipe; Insert: Omit<Equipe, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Equipe, 'id'>> }
      equipe_membres: { Row: EquipeMembre; Insert: Omit<EquipeMembre, 'id' | 'created_at'>; Update: Partial<EquipeMembre> }
      categories: { Row: Categorie; Insert: Omit<Categorie, 'id' | 'created_at'>; Update: Partial<Omit<Categorie, 'id'>> }
      medias: { Row: Media; Insert: Omit<Media, 'id' | 'created_at'>; Update: Partial<Omit<Media, 'id'>> }
      publications: { Row: Publication; Insert: Omit<Publication, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Publication, 'id'>> }
      evenements: { Row: Evenement; Insert: Omit<Evenement, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Evenement, 'id'>> }
      annonces: { Row: Annonce; Insert: Omit<Annonce, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Annonce, 'id'>> }
    }
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
    }
  }
}
