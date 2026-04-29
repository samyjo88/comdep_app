# Supabase — ComDept Église

## Structure des migrations

| Fichier | Contenu |
|---------|---------|
| `001_types_and_enums.sql` | Types PostgreSQL (enums) |
| `002_profiles_and_roles.sql` | Table `profiles`, `user_roles`, triggers, fonctions RLS |
| `003_equipes.sql` | Tables `equipes` et `equipe_membres` |
| `004_categories_and_medias.sql` | Tables `categories` et `medias` |
| `005_publications.sql` | Table `publications` et `publication_commentaires` |
| `006_evenements.sql` | Tables `evenements` et `evenement_taches` |
| `007_annonces.sql` | Tables `annonces` et `annonce_lectures` |
| `008_rls_profiles_and_roles.sql` | RLS pour profiles et rôles |
| `009_rls_equipes.sql` | RLS pour équipes et membres |
| `010_rls_medias_categories.sql` | RLS pour catégories et médias |
| `011_rls_publications.sql` | RLS pour publications et commentaires |
| `012_rls_evenements.sql` | RLS pour événements et tâches |
| `013_rls_annonces.sql` | RLS pour annonces et lectures |
| `014_storage.sql` | Buckets Storage et politiques |
| `015_seed_data.sql` | Données initiales (catégories, équipes) |

## Rôles utilisateurs

| Rôle | Description | Permissions |
|------|-------------|-------------|
| `super_admin` | Accès total | Tout |
| `admin` | Administrateur | Gestion utilisateurs, tout le contenu |
| `responsable` | Chef d'équipe | Crée événements, valide publications, gère son équipe |
| `redacteur` | Rédacteur | Crée et édite du contenu (publications, médias) |
| `membre` | Membre | Lecture, commentaires, marquer lu |

Les rôles sont hiérarchiques : `has_role('redacteur')` retourne `true` pour tout rôle supérieur.

## Comment appliquer les migrations

### Option A — Supabase Dashboard (recommandé)

1. Ouvrir [app.supabase.com](https://app.supabase.com)
2. Sélectionner le projet
3. Aller dans **SQL Editor**
4. Copier-coller et exécuter chaque fichier dans l'ordre (001 → 015)

### Option B — Supabase CLI

```bash
# Installer la CLI
npm install -g supabase

# Lier le projet
supabase login
supabase link --project-ref <votre-project-ref>

# Appliquer les migrations
supabase db push
```

## Créer le premier super_admin

Après inscription d'un utilisateur, exécuter dans le SQL Editor :

```sql
update public.user_roles
set role = 'super_admin'
where user_id = (
  select id from auth.users where email = 'votre@email.com'
);
```

## Variables d'environnement requises

```env
NEXT_PUBLIC_SUPABASE_URL=https://togolugdffbfatpiemug.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```
