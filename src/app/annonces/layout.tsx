import { redirect } from 'next/navigation'
import { Megaphone } from 'lucide-react'
import { AnnoncesNavTabs, AnnoncesBreadcrumb } from '@/components/annonces/AnnoncesNavTabs'
import { ModuleShell } from '@/components/nav/ModuleShell'
import { getModulesAccessibles } from '@/lib/dashboard/modules-access'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Annonces',
    default:  'Annonces',
  },
}

export default async function AnnoncesLayout({ children }: { children: React.ReactNode }) {
  const modules = await getModulesAccessibles()
  if (modules !== null && !modules.includes('annonces')) redirect('/dashboard')
  return (
    <ModuleShell
      module="annonces"
      titre="Annonces"
      icon={Megaphone}
      breadcrumb={<AnnoncesBreadcrumb />}
      onglets={<AnnoncesNavTabs />}
    >
      {children}
    </ModuleShell>
  )
}
