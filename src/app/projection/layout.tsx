import { redirect } from 'next/navigation'
import { Monitor } from 'lucide-react'
import { ProjectionNavTabs, ProjectionBreadcrumb } from '@/components/projection/ProjectionNavTabs'
import { ModuleShell } from '@/components/nav/ModuleShell'
import { getModulesAccessibles } from '@/lib/dashboard/modules-access'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Projection & Proclaim',
    default:  'Projection & Proclaim',
  },
}

export default async function ProjectionLayout({ children }: { children: React.ReactNode }) {
  const modules = await getModulesAccessibles()
  if (modules !== null && !modules.includes('projection')) redirect('/dashboard')
  return (
    <ModuleShell
      module="projection"
      titre="Projection & Proclaim"
      icon={Monitor}
      breadcrumb={<ProjectionBreadcrumb />}
      onglets={<ProjectionNavTabs />}
    >
      {children}
    </ModuleShell>
  )
}
