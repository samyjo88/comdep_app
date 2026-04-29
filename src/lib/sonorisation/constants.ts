import type { CategorieMateriel, StatutMateriel } from '@/lib/supabase/types'

export const CATEGORIES: { value: CategorieMateriel; label: string; emoji: string }[] = [
  { value: 'microphone',    label: 'Microphone',       emoji: '🎤' },
  { value: 'enceinte',      label: 'Enceinte',         emoji: '🔊' },
  { value: 'amplificateur', label: 'Amplificateur',    emoji: '🔌' },
  { value: 'mixette',       label: 'Table de mixage',  emoji: '🎚️' },
  { value: 'cable',         label: 'Câble / Connectique', emoji: '🔗' },
  { value: 'effet',         label: 'Effet / Processeur', emoji: '🎛️' },
  { value: 'instrument',    label: 'Instrument',       emoji: '🎸' },
  { value: 'accessoire',    label: 'Accessoire',       emoji: '🧰' },
  { value: 'autre',         label: 'Autre',            emoji: '📦' },
]

export const STATUTS: { value: StatutMateriel; label: string; variant: 'success' | 'info' | 'warning' | 'destructive' }[] = [
  { value: 'disponible',     label: 'Disponible',       variant: 'success' },
  { value: 'emprunte',       label: 'Emprunté',         variant: 'info' },
  { value: 'en_maintenance', label: 'En maintenance',   variant: 'warning' },
  { value: 'hors_service',   label: 'Hors service',     variant: 'destructive' },
]

export const CATEGORIE_LABEL: Record<CategorieMateriel, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, `${c.emoji} ${c.label}`])
) as Record<CategorieMateriel, string>

export const STATUT_CONFIG = Object.fromEntries(
  STATUTS.map(s => [s.value, s])
) as Record<StatutMateriel, typeof STATUTS[number]>
