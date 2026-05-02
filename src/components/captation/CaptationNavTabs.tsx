'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarDays, Users, ImagePlay, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Tableau de bord', href: '/captation',             icon: LayoutDashboard },
  { label: 'Planning',        href: '/captation/planning',    icon: CalendarDays },
  { label: 'Équipe',          href: '/captation/equipe',      icon: Users },
  { label: 'Médiathèque',     href: '/captation/mediatheque', icon: ImagePlay },
] as const

const PAGE_LABELS: Record<string, string> = {
  '/captation':             'Tableau de bord',
  '/captation/planning':    'Planning',
  '/captation/equipe':      'Équipe',
  '/captation/mediatheque': 'Médiathèque',
}

export function CaptationBreadcrumb() {
  const pathname = usePathname()
  // Match exact or first-level child (e.g. /captation/equipe/123 → 'Équipe')
  const key = Object.keys(PAGE_LABELS).find(k => pathname === k || pathname.startsWith(k + '/'))
  const label = key ? PAGE_LABELS[key] : null
  const isRoot = pathname === '/captation'

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground leading-none">
      <Link href="/captation" className="hover:text-foreground transition-colors">
        Captation &amp; Médias
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

export function CaptationNavTabs() {
  const pathname = usePathname()

  return (
    <nav
      className="flex -mb-px overflow-x-auto scrollbar-none"
      aria-label="Modules captation"
    >
      {TABS.map(({ label, href, icon: Icon }) => {
        const isActive = href === '/captation'
          ? pathname === '/captation'
          : pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 min-h-[44px]',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
