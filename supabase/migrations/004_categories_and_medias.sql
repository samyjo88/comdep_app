-- ============================================================
-- 004 - Catégories et médiathèque
-- ============================================================

-- Catégories partagées (publications, événements)
create table public.categories (
  id           bigint generated always as identity primary key,
  nom          text not null unique,
  slug         text not null unique,
  description  text,
  couleur      text default '#6366f1',
  created_at   timestamptz not null default now()
);

comment on table public.categories is 'Catégories partagées pour le contenu';

-- Médiathèque
create table public.medias (
  id            bigint generated always as identity primary key,
  nom           text not null,
  description   text,
  url           text not null,
  type          public.type_media not null default 'image',
  taille_octets bigint,
  largeur_px    int,
  hauteur_px    int,
  mime_type     text,
  storage_path  text,              -- chemin dans Supabase Storage
  uploaded_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

comment on table public.medias is 'Médiathèque centralisée';
