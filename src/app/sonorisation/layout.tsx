import { redirect } from 'next/navigation'
import { Volume2 } from 'lucide-react'
import { SonoBreadcrumb, SonoNavTabs } from '@/components/sonorisation/SonoNavTabs'
import { ModuleShell } from '@/components/nav/ModuleShell'
import { getModulesAccessibles } from '@/lib/dashboard/modules-access'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Sonorisation',
    default: 'Sonorisation',
  },
}

export default async function SonorisationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const modules = await getModulesAccessibles()
  if (modules !== null && !modules.includes('son')) redirect('/dashboard')
  return (
    <ModuleShell
      module="son"
      titre="Sonorisation"
      icon={Volume2}
      breadcrumb={<SonoBreadcrumb />}
      onglets={<SonoNavTabs />}
    >
      {children}
    </ModuleShell>
  )
}
