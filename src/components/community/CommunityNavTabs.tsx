'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarDays, FileImage, Lightbulb, BarChart2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Tableau de bord', href: '/community',          icon: LayoutDashboard },
  { label: 'Planning',        href: '/community/planning', icon: CalendarDays },
  { label: 'Posts',           href: '/community/posts',    icon: FileImage },
  { label: 'Idées',           href: '/community/idees',    icon: Lightbulb },
  { label: 'Rapports',        href: '/community/rapports', icon: BarChart2 },
] as const

const PAGE_LABELS: Record<string, string> = {
  '/community':          'Tableau de bord',
  '/community/planning': 'Planning',
  '/community/posts':    'Posts',
  '/community/idees':    'Idées',
  '/community/rapports': 'Rapports',
}

export function CommunityBreadcrumb() {
  const pathname = usePathname()
  const key   = Object.keys(PAGE_LABELS).find(k => pathname === k || pathname.startsWith(k + '/'))
  const label = key ? PAGE_LABELS[key] : null
  const isRoot = pathname === '/community'

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground leading-none">
      <Link href="/community" className="hover:text-foreground transition-colors">
        Community Management
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

export function CommunityNavTabs() {
  const pathname = usePathname()

  return (
    <nav
      className="flex -mb-px overflow-x-auto scrollbar-none"
      aria-label="Modules community management"
    >
      {TABS.map(({ label, href, icon: Icon }) => {
        const isActive = href === '/community'
          ? pathname === '/community'
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
