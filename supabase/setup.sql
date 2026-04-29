-- ================================================================
-- ComDept Église — Script SQL complet
-- Coller entièrement dans : SQL Editor > New Query > Run
-- ================================================================

-- ── 1. Types et énumérations ─────────────────────────────────────

create type public.app_role as enum (
  'super_admin',
  'admin',
  'responsable',
  'redacteur',
  'membre'
);

create type public.statut_publication as enum (
  'brouillon', 'en_revision', 'planifie', 'publie', 'archive'
);

create type public.canal_diffusion as enum (
  'site_web', 'reseaux_sociaux', 'email', 'affichage', 'bulletin', 'autre'
);

create type public.statut_evenement as enum (
  'planifie', 'en_cours', 'termine', 'annule'
);

create type public.type_media as enum (
  'image', 'video', 'audio', 'document', 'autre'
);

-- ── 2. Fonctions utilitaires (triggers) ──────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 3. Profiles et rôles ─────────────────────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  prenom      text not null,
  nom         text not null,
  email       text not null unique,
  telephone   text,
  avatar_url  text,
  bio         text,
  actif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create table public.user_roles (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       public.app_role not null default 'membre',
  created_at timestamptz not null default now(),
  constraint user_roles_user_id_key unique (user_id)
);

-- Trigger : crée automatiquement profil + rôle à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, prenom, nom, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'prenom', ''),
    coalesce(new.raw_user_meta_data->>'nom', ''),
    new.email
  );
  insert into public.user_roles (user_id, role) values (new.id, 'membre');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Fonctions de vérification des rôles (utilisées par les policies RLS)
create or replace function public.get_my_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

create or replace function public.has_role(required_role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select case get_my_role()
    when 'super_admin' then true
    when 'admin'       then required_role in ('admin', 'responsable', 'redacteur', 'membre')
    when 'responsable' then required_role in ('responsable', 'redacteur', 'membre')
    when 'redacteur'   then required_role in ('redacteur', 'membre')
    when 'membre'      then required_role = 'membre'
    else false
  end;
$$;

-- ── 4. Équipes ───────────────────────────────────────────────────

create table public.equipes (
  id          bigint generated always as identity primary key,
  nom         text not null,
  description text,
  couleur     text default '#6366f1',
  actif       boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger equipes_updated_at
  before update on public.equipes
  for each row execute procedure public.set_updated_at();

create table public.equipe_membres (
  id         bigint generated always as identity primary key,
  equipe_id  bigint not null references public.equipes(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  est_chef   boolean not null default false,
  created_at timestamptz not null default now(),
  constraint equipe_membres_unique unique (equipe_id, user_id)
);

-- ── 5. Catégories et médiathèque ─────────────────────────────────

create table public.categories (
  id          bigint generated always as identity primary key,
  nom         text not null unique,
  slug        text not null unique,
  description text,
  couleur     text default '#6366f1',
  created_at  timestamptz not null default now()
);

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
  storage_path  text,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ── 6. Publications ──────────────────────────────────────────────

create table public.publications (
  id               bigint generated always as identity primary key,
  titre            text not null,
  slug             text not null unique,
  contenu          text,
  resume           text,
  image_couv_id    bigint references public.medias(id) on delete set null,
  statut           public.statut_publication not null default 'brouillon',
  canaux           public.canal_diffusion[] default '{}',
  categorie_id     bigint references public.categories(id) on delete set null,
  equipe_id        bigint references public.equipes(id) on delete set null,
  auteur_id        uuid references public.profiles(id) on delete set null,
  validateur_id    uuid references public.profiles(id) on delete set null,
  date_publication timestamptz,
  date_expiration  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger publications_updated_at
  before update on public.publications
  for each row execute procedure public.set_updated_at();

create table public.publication_commentaires (
  id             bigint generated always as identity primary key,
  publication_id bigint not null references public.publications(id) on delete cascade,
  auteur_id      uuid not null references public.profiles(id) on delete cascade,
  contenu        text not null,
  created_at     timestamptz not null default now()
);

-- ── 7. Événements ────────────────────────────────────────────────

create table public.evenements (
  id             bigint generated always as identity primary key,
  titre          text not null,
  description    text,
  lieu           text,
  date_debut     timestamptz not null,
  date_fin       timestamptz,
  statut         public.statut_evenement not null default 'planifie',
  categorie_id   bigint references public.categories(id) on delete set null,
  equipe_id      bigint references public.equipes(id) on delete set null,
  image_id       bigint references public.medias(id) on delete set null,
  responsable_id uuid references public.profiles(id) on delete set null,
  est_public     boolean not null default true,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger evenements_updated_at
  before update on public.evenements
  for each row execute procedure public.set_updated_at();

create table public.evenement_taches (
  id           bigint generated always as identity primary key,
  evenement_id bigint not null references public.evenements(id) on delete cascade,
  titre        text not null,
  description  text,
  assignee_id  uuid references public.profiles(id) on delete set null,
  terminee     boolean not null default false,
  echeance     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger evenement_taches_updated_at
  before update on public.evenement_taches
  for each row execute procedure public.set_updated_at();

-- ── 8. Annonces ──────────────────────────────────────────────────

create table public.annonces (
  id              bigint generated always as identity primary key,
  titre           text not null,
  contenu         text not null,
  priorite        int not null default 0 check (priorite between 0 and 5),
  epinglee        boolean not null default false,
  auteur_id       uuid references public.profiles(id) on delete set null,
  equipe_id       bigint references public.equipes(id) on delete set null,
  date_expiration timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger annonces_updated_at
  before update on public.annonces
  for each row execute procedure public.set_updated_at();

create table public.annonce_lectures (
  annonce_id bigint not null references public.annonces(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  lu_at      timestamptz not null default now(),
  primary key (annonce_id, user_id)
);

-- ── 9. RLS : profiles et user_roles ─────────────────────────────

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (actif = true);
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_update_admin" on public.profiles
  for update to authenticated using (public.has_role('admin'));
create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated using (public.has_role('admin'));

create policy "user_roles_select" on public.user_roles
  for select to authenticated using (true);
create policy "user_roles_insert_admin" on public.user_roles
  for insert to authenticated with check (public.has_role('admin'));
create policy "user_roles_update_admin" on public.user_roles
  for update to authenticated using (public.has_role('admin'));
create policy "user_roles_delete_admin" on public.user_roles
  for delete to authenticated using (public.has_role('admin'));

-- ── 10. RLS : equipes et equipe_membres ──────────────────────────

alter table public.equipes enable row level security;
alter table public.equipe_membres enable row level security;

create policy "equipes_select" on public.equipes
  for select to authenticated using (actif = true or public.has_role('admin'));
create policy "equipes_insert" on public.equipes
  for insert to authenticated with check (public.has_role('responsable'));
create policy "equipes_update_admin" on public.equipes
  for update to authenticated using (public.has_role('admin'));
create policy "equipes_update_chef" on public.equipes
  for update to authenticated
  using (exists (select 1 from public.equipe_membres em
    where em.equipe_id = equipes.id and em.user_id = auth.uid() and em.est_chef = true));
create policy "equipes_delete_admin" on public.equipes
  for delete to authenticated using (public.has_role('admin'));

create policy "equipe_membres_select" on public.equipe_membres
  for select to authenticated using (true);
create policy "equipe_membres_insert" on public.equipe_membres
  for insert to authenticated
  with check (public.has_role('admin') or exists (
    select 1 from public.equipe_membres em
    where em.equipe_id = equipe_membres.equipe_id and em.user_id = auth.uid() and em.est_chef = true));
create policy "equipe_membres_update" on public.equipe_membres
  for update to authenticated
  using (public.has_role('admin') or exists (
    select 1 from public.equipe_membres em
    where em.equipe_id = equipe_membres.equipe_id and em.user_id = auth.uid() and em.est_chef = true));
create policy "equipe_membres_delete" on public.equipe_membres
  for delete to authenticated
  using (public.has_role('admin') or user_id = auth.uid() or exists (
    select 1 from public.equipe_membres em
    where em.equipe_id = equipe_membres.equipe_id and em.user_id = auth.uid() and em.est_chef = true));

-- ── 11. RLS : categories et medias ───────────────────────────────

alter table public.categories enable row level security;
alter table public.medias enable row level security;

create policy "categories_select_all" on public.categories
  for select using (true);
create policy "categories_insert" on public.categories
  for insert to authenticated with check (public.has_role('responsable'));
create policy "categories_update" on public.categories
  for update to authenticated using (public.has_role('responsable'));
create policy "categories_delete" on public.categories
  for delete to authenticated using (public.has_role('admin'));

create policy "medias_select" on public.medias
  for select to authenticated using (true);
create policy "medias_insert" on public.medias
  for insert to authenticated
  with check (public.has_role('redacteur') and uploaded_by = auth.uid());
create policy "medias_update" on public.medias
  for update to authenticated
  using (uploaded_by = auth.uid() or public.has_role('admin'));
create policy "medias_delete" on public.medias
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.has_role('admin'));

-- ── 12. RLS : publications et commentaires ───────────────────────

alter table public.publications enable row level security;
alter table public.publication_commentaires enable row level security;

create policy "publications_select_public" on public.publications
  for select using (statut = 'publie');
create policy "publications_select_authenticated" on public.publications
  for select to authenticated
  using (statut = 'publie' or auteur_id = auth.uid() or public.has_role('responsable')
    or exists (select 1 from public.equipe_membres em
      where em.equipe_id = publications.equipe_id and em.user_id = auth.uid()));
create policy "publications_insert" on public.publications
  for insert to authenticated
  with check (public.has_role('redacteur') and auteur_id = auth.uid());
create policy "publications_update_auteur" on public.publications
  for update to authenticated
  using (auteur_id = auth.uid() and statut in ('brouillon', 'en_revision'));
create policy "publications_update_admin" on public.publications
  for update to authenticated using (public.has_role('responsable'));
create policy "publications_delete_admin" on public.publications
  for delete to authenticated using (public.has_role('admin'));
create policy "publications_delete_auteur" on public.publications
  for delete to authenticated
  using (auteur_id = auth.uid() and statut = 'brouillon');

create policy "pub_commentaires_select" on public.publication_commentaires
  for select to authenticated using (true);
create policy "pub_commentaires_insert" on public.publication_commentaires
  for insert to authenticated with check (auteur_id = auth.uid());
create policy "pub_commentaires_delete" on public.publication_commentaires
  for delete to authenticated
  using (auteur_id = auth.uid() or public.has_role('admin'));

-- ── 13. RLS : evenements et tâches ───────────────────────────────

alter table public.evenements enable row level security;
alter table public.evenement_taches enable row level security;

create policy "evenements_select_public" on public.evenements
  for select using (est_public = true and statut != 'annule');
create policy "evenements_select_authenticated" on public.evenements
  for select to authenticated using (true);
create policy "evenements_insert" on public.evenements
  for insert to authenticated with check (public.has_role('responsable'));
create policy "evenements_update" on public.evenements
  for update to authenticated
  using (responsable_id = auth.uid() or created_by = auth.uid() or public.has_role('admin'));
create policy "evenements_delete_admin" on public.evenements
  for delete to authenticated using (public.has_role('admin'));

create policy "evenement_taches_select" on public.evenement_taches
  for select to authenticated
  using (public.has_role('responsable') or assignee_id = auth.uid() or exists (
    select 1 from public.evenements e
    join public.equipe_membres em on em.equipe_id = e.equipe_id
    where e.id = evenement_taches.evenement_id and em.user_id = auth.uid()));
create policy "evenement_taches_insert" on public.evenement_taches
  for insert to authenticated with check (public.has_role('responsable'));
create policy "evenement_taches_update" on public.evenement_taches
  for update to authenticated
  using (assignee_id = auth.uid() or public.has_role('responsable'));
create policy "evenement_taches_delete" on public.evenement_taches
  for delete to authenticated using (public.has_role('responsable'));

-- ── 14. RLS : annonces et lectures ───────────────────────────────

alter table public.annonces enable row level security;
alter table public.annonce_lectures enable row level security;

create policy "annonces_select" on public.annonces
  for select to authenticated
  using ((date_expiration is null or date_expiration > now())
    and (equipe_id is null or auteur_id = auth.uid() or public.has_role('admin')
      or exists (select 1 from public.equipe_membres em
        where em.equipe_id = annonces.equipe_id and em.user_id = auth.uid())));
create policy "annonces_insert" on public.annonces
  for insert to authenticated
  with check (auteur_id = auth.uid() and (
    public.has_role('responsable') or (
      equipe_id is not null and public.has_role('redacteur')
      and exists (select 1 from public.equipe_membres em
        where em.equipe_id = annonces.equipe_id and em.user_id = auth.uid()))));
create policy "annonces_update" on public.annonces
  for update to authenticated
  using (auteur_id = auth.uid() or public.has_role('admin'));
create policy "annonces_delete" on public.annonces
  for delete to authenticated
  using (auteur_id = auth.uid() or public.has_role('admin'));

create policy "annonce_lectures_select" on public.annonce_lectures
  for select to authenticated
  using (user_id = auth.uid() or public.has_role('admin'));
create policy "annonce_lectures_insert" on public.annonce_lectures
  for insert to authenticated with check (user_id = auth.uid());
create policy "annonce_lectures_delete" on public.annonce_lectures
  for delete to authenticated using (user_id = auth.uid());

-- ── 15. Storage ───────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medias', 'medias', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml',
        'video/mp4','video/webm','audio/mpeg','audio/ogg','application/pdf']
) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 104857600,
  array['application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) on conflict (id) do nothing;

create policy "storage_medias_select" on storage.objects
  for select using (bucket_id = 'medias');
create policy "storage_medias_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'medias' and public.has_role('redacteur'));
create policy "storage_medias_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'medias'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.has_role('admin')));

create policy "storage_documents_select" on storage.objects
  for select to authenticated using (bucket_id = 'documents');
create policy "storage_documents_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and public.has_role('redacteur'));
create policy "storage_documents_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.has_role('admin')));

-- ── 16. Données initiales ─────────────────────────────────────────

insert into public.categories (nom, slug, description, couleur) values
  ('Adoration',        'adoration',        'Contenu lié au temps d''adoration',        '#8b5cf6'),
  ('Évangélisation',   'evangelisation',   'Actions et supports d''évangélisation',    '#f59e0b'),
  ('Formation',        'formation',        'Enseignements et formations internes',      '#3b82f6'),
  ('Vie de l''église', 'vie-eglise',       'Annonces et actualités de la communauté',  '#10b981'),
  ('Médias',           'medias',           'Podcasts, vidéos et créations visuelles',  '#ec4899'),
  ('Prière',           'priere',           'Réunions et sujets de prière',             '#6366f1')
on conflict (slug) do nothing;

insert into public.equipes (nom, description, couleur) values
  ('Direction',        'Équipe de direction du département',         '#1e293b'),
  ('Graphisme',        'Création visuelle et charte graphique',      '#ec4899'),
  ('Réseaux sociaux',  'Gestion des comptes et publications social', '#3b82f6'),
  ('Audiovisuel',      'Son, vidéo, streaming',                      '#f59e0b'),
  ('Rédaction',        'Articles, bulletins, newsletters',           '#10b981'),
  ('Web',              'Site internet et outils numériques',         '#6366f1')
on conflict do nothing;

-- ── FIN ───────────────────────────────────────────────────────────
-- Après exécution, promouvoir le premier admin :
--
--   update public.user_roles set role = 'super_admin'
--   where user_id = (select id from auth.users where email = 'votre@email.com');
