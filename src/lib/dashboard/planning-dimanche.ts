import { createClient } from '@/lib/supabase/server'
import {
  DEPARTEMENTS, DEPARTEMENTS_CONFIG,
  type AssignationDimanche, type Departement,
  type MembreDepartement, type MembresParDepartement,
} from '@/types/planning-dimanche'

// Nombre de dimanches affichés (16 ≈ 3,5 mois)
export const NB_DIMANCHES = 16

function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Les NB_DIMANCHES prochains dimanches (aujourd'hui inclus si dimanche). */
export function getProchainsDimanches(nb: number = NB_DIMANCHES): string[] {
  const d = new Date()
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7))
  const dimanches: string[] = []
  for (let i = 0; i < nb; i++) {
    dimanches.push(dateToStr(d))
    d.setDate(d.getDate() + 7)
  }
  return dimanches
}

export async function getAssignations(dateMin: string, dateMax: string): Promise<{
  data?: AssignationDimanche[]
  error?: string
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data, error } = await supabase
    .from('planning_dimanche')
    .select('id, date_dimanche, departement, slot, membre_id')
    .gte('date_dimanche', dateMin)
    .lte('date_dimanche', dateMax)
    .order('date_dimanche', { ascending: true })

  if (error) return { error: (error as { message: string }).message }
  return { data: (data ?? []) as AssignationDimanche[] }
}

/** Charge les membres des 5 départements (tous, actifs ou non, pour résoudre les noms). */
export async function getMembresParDepartement(): Promise<MembresParDepartement> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const results = await Promise.all(
    DEPARTEMENTS.map(dept =>
      supabase
        .from(DEPARTEMENTS_CONFIG[dept].table)
        .select('id, prenom, nom, actif')
        .order('prenom', { ascending: true })
    )
  )

  const membres = {} as MembresParDepartement
  DEPARTEMENTS.forEach((dept: Departement, i: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (results[i].data ?? []) as any[]
    membres[dept] = rows.map((m): MembreDepartement => ({
      id:     String(m.id),
      prenom: m.prenom,
      nom:    m.nom,
      actif:  m.actif,
    }))
  })
  return membres
}
