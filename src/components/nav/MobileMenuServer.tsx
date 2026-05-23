import { MobileMenu }            from './MobileMenu'
import { getModulesAccessibles } from '@/lib/dashboard/modules-access'

export async function MobileMenuServer() {
  let modulesAccessibles: string[] | null = null
  try {
    modulesAccessibles = await getModulesAccessibles()
  } catch { /* Supabase non configuré en dev */ }
  return <MobileMenu modulesAccessibles={modulesAccessibles} />
}
