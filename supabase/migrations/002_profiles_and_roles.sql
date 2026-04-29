-- ============================================================
-- 002 - Profils utilisateurs et rôles
-- ============================================================

-- Table des profils (extension de auth.users)
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  prenom       text not null,
  nom          text not null,
  email        text not null unique,
  telephone    text,
  avatar_url   text,
  bio          text,
  actif        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Profils étendus des utilisateurs Supabase Auth';

-- Table des rôles utilisateurs (1 rôle par utilisateur)
create table public.user_roles (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       public.app_role not null default 'membre',
  created_at timestamptz not null default now(),
  constraint user_roles_user_id_key unique (user_id)
);

comment on table public.user_roles is 'Rôle applicatif de chaque utilisateur';

-- Trigger : créer automatiquement un profil + rôle à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, prenom, nom, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'prenom', ''),
    coalesce(new.raw_user_meta_data->>'nom', ''),
    new.email
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'membre');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger : mettre à jour updated_at automatiquement
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Fonction utilitaire : récupérer le rôle de l'utilisateur courant
create or replace function public.get_my_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

-- Fonction utilitaire : vérifier si l'utilisateur a au moins un certain rôle
create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case get_my_role()
    when 'super_admin' then true
    when 'admin'       then required_role in ('admin', 'responsable', 'redacteur', 'membre')
    when 'responsable' then required_role in ('responsable', 'redacteur', 'membre')
    when 'redacteur'   then required_role in ('redacteur', 'membre')
    when 'membre'      then required_role = 'membre'
    else false
  end;
$$;
