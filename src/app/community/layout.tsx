import { redirect } from 'next/navigation'
import { Share2 } from 'lucide-react'
import { CommunityBreadcrumb, CommunityNavTabs } from '@/components/community/CommunityNavTabs'
import { ModuleShell } from '@/components/nav/ModuleShell'
import { getModulesAccessibles } from '@/lib/dashboard/modules-access'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Community Management',
    default:  'Community Management',
  },
}

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const modules = await getModulesAccessibles()
  if (modules !== null && !modules.includes('community')) redirect('/dashboard')
  return (
    <ModuleShell
      module="community"
      titre="Community Management"
      icon={Share2}
      breadcrumb={<CommunityBreadcrumb />}
      onglets={<CommunityNavTabs />}
    >
      {children}
    </ModuleShell>
  )
}
