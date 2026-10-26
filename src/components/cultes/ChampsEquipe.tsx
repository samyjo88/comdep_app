'use client'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { MembreResume } from '@/types/cultes'

export const classeSelect =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'

interface MembreAvecRoles extends MembreResume { roles?: string[] }

interface Props {
  roles:    { code: string; label: string }[]
  membres:  MembreAvecRoles[]
  valeurs:  Record<string, string | null>
  onChange: (role: string, membreId: string | null) => void
  /** Ne propose pour un rôle que les membres qui l'ont dans leur fiche */
  filtrerParRole?: boolean
  className?: string
}

/** Une liste déroulante par rôle pour désigner les membres d'une équipe. */
export function ChampsEquipe({ roles, membres, valeurs, onChange, filtrerParRole, className }: Props) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {roles.map(r => {
        const candidats = filtrerParRole
          ? membres.filter(m => !m.roles || m.roles.length === 0 || m.roles.includes(r.code))
          : membres
        // Un membre déjà choisi pour un autre rôle n'est pas proposé une deuxième fois
        const prisAilleurs = new Set(
          Object.entries(valeurs).filter(([role, id]) => role !== r.code && id).map(([, id]) => id),
        )
        const id = `role-${r.code}`
        return (
          <div key={r.code} className="space-y-1.5">
            <Label htmlFor={id} className="text-xs text-muted-foreground">{r.label}</Label>
            <select
              id={id}
              className={classeSelect}
              value={valeurs[r.code] ?? ''}
              onChange={e => onChange(r.code, e.target.value || null)}
            >
              <option value="">— À désigner —</option>
              {candidats.map(m => (
                <option key={m.id} value={m.id} disabled={prisAilleurs.has(m.id)}>
                  {m.nom}{!m.email ? ' (pas d’e-mail)' : ''}
                </option>
              ))}
            </select>
          </div>
        )
      })}
    </div>
  )
}
