-- ============================================================
-- 015 - Données initiales (seed)
-- ============================================================

-- Catégories de base
insert into public.categories (nom, slug, description, couleur) values
  ('Adoration',       'adoration',       'Contenu lié au temps d''adoration',         '#8b5cf6'),
  ('Évangélisation',  'evangelisation',  'Actions et supports d''évangélisation',     '#f59e0b'),
  ('Formation',       'formation',       'Enseignements et formations internes',       '#3b82f6'),
  ('Vie de l''église','vie-eglise',      'Annonces et actualités de la communauté',   '#10b981'),
  ('Médias',          'medias',          'Podcasts, vidéos et créations visuelles',   '#ec4899'),
  ('Prière',          'priere',          'Réunions et sujets de prière',              '#6366f1')
on conflict (slug) do nothing;

-- Équipes de départ
insert into public.equipes (nom, description, couleur) values
  ('Direction',       'Équipe de direction du département',         '#1e293b'),
  ('Graphisme',       'Création visuelle et charte graphique',      '#ec4899'),
  ('Réseaux sociaux', 'Gestion des comptes et publications social', '#3b82f6'),
  ('Audiovisuel',     'Son, vidéo, streaming',                      '#f59e0b'),
  ('Rédaction',       'Articles, bulletins, newsletters',           '#10b981'),
  ('Web',             'Site internet et outils numériques',         '#6366f1')
on conflict do nothing;
