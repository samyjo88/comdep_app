import type { LucideIcon } from 'lucide-react'
import { PageTransition } from '@/components/PageTransition'
import type { ModuleCode } from '@/lib/auth/guards'

interface Props {
  module:     ModuleCode
  titre:      string
  icon:       LucideIcon
  breadcrumb: React.ReactNode
  onglets:    React.ReactNode
  children:   React.ReactNode
}

/** En-tête commun des modules : icône et couleur du module, fil d'Ariane, onglets. */
export function ModuleShell({ module, titre, icon: Icon, breadcrumb, onglets, children }: Props) {
  return (
    <div data-module={module} className="flex flex-1 flex-col bg-background">
      <div className="sticky top-12 z-30 border-b bg-card/95 backdrop-blur-md print:hidden">
        {/* Liseré de couleur du module */}
        <div className="h-0.5 bg-gradient-to-r from-module via-module/60 to-transparent" />
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-3 pb-1 pt-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-module/12 text-module ring-1 ring-module/20">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="truncate text-lg font-bold leading-tight">{titre}</h1>
              {breadcrumb}
            </div>
          </div>
          {onglets}
        </div>
      </div>

      <main className="flex-1"><PageTransition>{children}</PageTransition></main>
    </div>
  )
}
