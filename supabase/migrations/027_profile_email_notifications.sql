-- Ajoute la préférence de notifications e-mail sur le profil utilisateur
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.email_notifications
  IS 'Recevoir les notifications par e-mail (rappels culte, alertes matériel, etc.)';
