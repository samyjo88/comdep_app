'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PlusCircle, Clock, RefreshCw, Users, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Nouveau culte',    href: '/annonces/nouveau',    icon: PlusCircle },
  { label: 'Historique',       href: '/annonces/historique', icon: Clock },
  { label: 'Suivi reconduite', href: '/annonces/suivi',      icon: RefreshCw },
  { label: 'Équipe',           href: '/annonces/equipe',     icon: Users },
] as const

const PAGE_LABELS: Record<string, string> = {
  '/annonces/nouveau':    'Nouveau culte',
  '/annonces/historique': 'Historique',
  '/annonces/suivi':      'Suivi reconduite',
  '/annonces/equipe':     'Équipe',
}

export function AnnoncesNavTabs() {
  const pathname = usePathname()

  return (
    <nav
      className="flex -mb-px overflow-x-auto scrollbar-none"
      aria-label="Modules annonces"
    >
      {TABS.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 min-h-[44px]',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sr-only sm:hidden">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function AnnoncesBreadcrumb() {
  const pathname = usePathname()
  const label = PAGE_LABELS[pathname]

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground leading-none">
      <Link href="/dashboard" className="hover:text-foreground transition-colors">
        Dashboard
      </Link>
      <ChevronRight className="h-3 w-3 shrink-0" />
      <Link href="/annonces" className="hover:text-foreground transition-colors">
        Annonces
      </Link>
      {label && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-foreground font-medium">{label}</span>
        </>
      )}
    </div>
  )
}
