-- ============================================================
-- 005 - Publications (contenus à diffuser)
-- ============================================================

create table public.publications (
  id              bigint generated always as identity primary key,
  titre           text not null,
  slug            text not null unique,
  contenu         text,                           -- corps riche (Markdown/HTML)
  resume          text,
  image_couv_id   bigint references public.medias(id) on delete set null,
  statut          public.statut_publication not null default 'brouillon',
  canaux          public.canal_diffusion[] default '{}',
  categorie_id    bigint references public.categories(id) on delete set null,
  equipe_id       bigint references public.equipes(id) on delete set null,
  auteur_id       uuid references public.profiles(id) on delete set null,
  validateur_id   uuid references public.profiles(id) on delete set null,
  date_publication timestamptz,
  date_expiration  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.publications is 'Contenus à diffuser sur les canaux de communication';

create trigger publications_updated_at
  before update on public.publications
  for each row execute procedure public.set_updated_at();

-- Générer automatiquement un slug à partir du titre
create or replace function public.generate_slug(titre text)
returns text
language sql
immutable
as $$
  select lower(
    regexp_replace(
      regexp_replace(
        translate(titre,
          'àáâãäåæçèéêëìíîïðñòóôõöùúûüýþÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
          'aaaaaéaceeeeiiiiidnoooooouuuuythaaaaaaaceeeeiiiinoooooouuuuy'
        ),
        '[^a-z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
$$;

-- Table de commentaires/retours sur une publication
create table public.publication_commentaires (
  id              bigint generated always as identity primary key,
  publication_id  bigint not null references public.publications(id) on delete cascade,
  auteur_id       uuid not null references public.profiles(id) on delete cascade,
  contenu         text not null,
  created_at      timestamptz not null default now()
);
