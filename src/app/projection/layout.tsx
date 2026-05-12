import { Monitor } from 'lucide-react'
import { ProjectionNavTabs, ProjectionBreadcrumb } from '@/components/projection/ProjectionNavTabs'
import { PageTransition } from '@/components/PageTransition'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Projection & Proclaim',
    default:  'Projection & Proclaim',
  },
}

export default function ProjectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card sticky top-12 z-30 shadow-sm print:hidden">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center gap-3 pt-4 pb-1">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-bold leading-tight tracking-tight">
                Projection &amp; Proclaim
              </span>
              <ProjectionBreadcrumb />
            </div>
          </div>

          <ProjectionNavTabs />
        </div>
      </div>

      <main><PageTransition>{children}</PageTransition></main>
    </div>
  )
}
