import { Megaphone } from 'lucide-react'
import { AnnoncesNavTabs, AnnoncesBreadcrumb } from '@/components/annonces/AnnoncesNavTabs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Annonces',
    default:  'Annonces',
  },
}

export default function AnnoncesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center gap-3 pt-4 pb-1">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-bold leading-tight tracking-tight">
                Annonces
              </span>
              <AnnoncesBreadcrumb />
            </div>
          </div>

          <AnnoncesNavTabs />
        </div>
      </div>

      <main>{children}</main>
    </div>
  )
}
