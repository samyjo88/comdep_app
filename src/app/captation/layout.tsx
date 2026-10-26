import { redirect } from 'next/navigation'
import { Video } from 'lucide-react'
import { CaptationNavTabs, CaptationBreadcrumb } from '@/components/captation/CaptationNavTabs'
import { ModuleShell } from '@/components/nav/ModuleShell'
import { getModulesAccessibles } from '@/lib/dashboard/modules-access'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Captation & Médias',
    default:  'Captation & Médias',
  },
}

export default async function CaptationLayout({ children }: { children: React.ReactNode }) {
  const modules = await getModulesAccessibles()
  // null = admin/responsable = accès total ; tableau = vérifier la présence de 'captation'
  if (modules !== null && !modules.includes('captation')) redirect('/dashboard')
  return (
    <ModuleShell
      module="captation"
      titre="Captation & Médias"
      icon={Video}
      breadcrumb={<CaptationBreadcrumb />}
      onglets={<CaptationNavTabs />}
    >
      {children}
    </ModuleShell>
  )
}
