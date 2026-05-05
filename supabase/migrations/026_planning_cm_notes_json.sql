-- Ajout du champ notes_json sur planning_cm pour stocker la checklist CM
ALTER TABLE planning_cm
  ADD COLUMN IF NOT EXISTS notes_json jsonb DEFAULT '{}'::jsonb;
