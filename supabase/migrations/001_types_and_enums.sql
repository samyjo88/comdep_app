-- ============================================================
-- 001 - Types et énumérations
-- ============================================================

-- Rôles utilisateurs dans l'application
create type public.app_role as enum (
  'super_admin',   -- Accès total à tout
  'admin',         -- Gestion des utilisateurs et du contenu
  'responsable',   -- Responsable d'une ou plusieurs équipes
  'redacteur',     -- Création et édition de contenu
  'membre'         -- Lecture seule
);

-- Statut du contenu publié
create type public.statut_publication as enum (
  'brouillon',
  'en_revision',
  'planifie',
  'publie',
  'archive'
);

-- Canaux de diffusion
create type public.canal_diffusion as enum (
  'site_web',
  'reseaux_sociaux',
  'email',
  'affichage',
  'bulletin',
  'autre'
);

-- Statut des événements
create type public.statut_evenement as enum (
  'planifie',
  'en_cours',
  'termine',
  'annule'
);

-- Type de média
create type public.type_media as enum (
  'image',
  'video',
  'audio',
  'document',
  'autre'
);
