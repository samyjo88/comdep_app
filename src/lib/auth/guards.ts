import { getModulesAccessibles, getMyRole } from '@/lib/dashboard/modules-access'
import type { AppRole } from '@/lib/supabase/types'

export type ModuleCode = 'son' | 'captation' | 'community' | 'annonces' | 'projection'

export const ROLES_ADMIN: AppRole[] = ['super_admin', 'admin']

/**
 * Vérifie côté serveur que l'utilisateur connecté a l'un des rôles donnés.
 * À appeler en tête des actions serveur sensibles : les restrictions de
 * l'interface ne protègent pas un appel direct à l'action.
 */
export async function requireRole(roles: AppRole[]): Promise<void> {
  const role = await getMyRole()
  if (!role || !roles.includes(role as AppRole)) {
    throw new Error('Accès refusé : droits insuffisants.')
  }
}

/** Vérifie que l'utilisateur connecté a accès au module (même règle que les layouts). */
export async function requireModule(module: ModuleCode): Promise<void> {
  const modules = await getModulesAccessibles()
  if (modules !== null && !modules.includes(module)) {
    throw new Error('Accès refusé à ce module.')
  }
}
