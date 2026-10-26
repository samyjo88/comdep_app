import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getModulesAccessibles } from '@/lib/dashboard/modules-access'
import { PageTransition } from '@/components/PageTransition'

export const metadata: Metadata = {
  title: { template: '%s | Cultes', default: 'Programme des cultes' },
}

export default async function CultesLayout({ children }: { children: React.ReactNode }) {
  const modules = await getModulesAccessibles()
  if (modules !== null && modules.length === 0) redirect('/dashboard')
  return (
    <main className="flex-1 bg-muted/30">
      <PageTransition>{children}</PageTransition>
    </main>
  )
}
