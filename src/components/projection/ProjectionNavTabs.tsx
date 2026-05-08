'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Music, List, CalendarDays, Users, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Tableau de bord', href: '/projection',            icon: LayoutDashboard },
  { label: 'Cantiques',       href: '/projection/cantiques',  icon: Music },
  { label: 'Setlists',        href: '/projection/setlists',   icon: List },
  { label: 'Planning',        href: '/projection/planning',   icon: CalendarDays },
  { label: 'Équipe',          href: '/projection/equipe',     icon: Users },
] as const

const PAGE_LABELS: Record<string, string> = {
  '/projection':            'Tableau de bord',
  '/projection/cantiques':  'Cantiques',
  '/projection/setlists':   'Setlists',
  '/projection/planning':   'Planning',
  '/projection/equipe':     'Équipe',
}

export function ProjectionBreadcrumb() {
  const pathname = usePathname()
  const key = Object.keys(PAGE_LABELS).find(k => pathname === k || pathname.startsWith(k + '/'))
  const label = key ? PAGE_LABELS[key] : null
  const isRoot = pathname === '/projection'

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground leading-none">
      <Link href="/dashboard" className="hover:text-foreground transition-colors">
        Dashboard
      </Link>
      <ChevronRight className="h-3 w-3 shrink-0" />
      <Link href="/projection" className="hover:text-foreground transition-colors">
        Projection
      </Link>
      {label && !isRoot && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-foreground font-medium">{label}</span>
        </>
      )}
    </div>
  )
}

export function ProjectionNavTabs() {
  const pathname = usePathname()

  return (
    <nav
      className="flex -mb-px overflow-x-auto scrollbar-none"
      aria-label="Modules projection"
    >
      {TABS.map(({ label, href, icon: Icon }) => {
        const isActive = href === '/projection'
          ? pathname === '/projection'
          : pathname === href || pathname.startsWith(href + '/')
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
