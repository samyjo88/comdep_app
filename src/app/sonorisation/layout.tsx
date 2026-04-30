import { Volume2 } from 'lucide-react'
import { SonoBreadcrumb, SonoNavTabs } from '@/components/sonorisation/SonoNavTabs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Sonorisation',
    default: 'Sonorisation',
  },
}

export default function SonorisationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Barre de navigation du module */}
      <div className="border-b bg-card sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* En-tête + breadcrumb */}
          <div className="flex items-center gap-3 pt-4 pb-1">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
              <Volume2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-bold leading-tight tracking-tight">
                Sonorisation
              </span>
              <SonoBreadcrumb />
            </div>
          </div>

          {/* Onglets */}
          <SonoNavTabs />
        </div>
      </div>

      {/* Contenu de la page */}
      <main>{children}</main>
    </div>
  )
}
