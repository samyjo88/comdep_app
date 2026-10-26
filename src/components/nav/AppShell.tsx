'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { AppSidebar } from './AppSidebar'
import { MobileBottomNav } from './MobileBottomNav'
import { CommandPalette, ouvrirPalette } from './CommandPalette'

const SANS_CHROME = ['/login', '/profil/reset-password']

interface Props {
  modulesAccessibles: string[] | null
  estAdmin:           boolean
  /** Boutons de droite de l'en-tête (thème, notifications, compte) */
  actions:            React.ReactNode
  children:           React.ReactNode
}

/**
 * Structure commune des pages connectées : barre latérale (ordinateur),
 * en-tête, barre de navigation basse (mobile) et palette de commandes.
 */
export function AppShell({ modulesAccessibles, estAdmin, actions, children }: Props) {
  const pathname = usePathname()

  if (SANS_CHROME.includes(pathname) || pathname.startsWith('/auth/')) {
    return <>{children}</>
  }

  return (
    <>
      <AppSidebar modulesAccessibles={modulesAccessibles} estAdmin={estAdmin} />

      <div className="flex min-h-dvh flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-40 h-12 shrink-0 border-b bg-card/90 backdrop-blur-md print:hidden">
          <div className="flex h-full items-center justify-between gap-3 px-4 lg:px-6">
            <Link href="/dashboard" className="transition-opacity hover:opacity-80 lg:hidden">
              <BrandMark taille={28} />
            </Link>

            <button
              type="button"
              onClick={ouvrirPalette}
              className="hidden items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground lg:flex"
            >
              <Search className="h-4 w-4" />
              Aller à…
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={ouvrirPalette}
                aria-label="Rechercher"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
              >
                <Search className="h-4 w-4" />
              </button>
              {actions}
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col pb-20 lg:pb-0">{children}</div>
      </div>

      <MobileBottomNav modulesAccessibles={modulesAccessibles} />
      <CommandPalette modulesAccessibles={modulesAccessibles} estAdmin={estAdmin} />
    </>
  )
}
