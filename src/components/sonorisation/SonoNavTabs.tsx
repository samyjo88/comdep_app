'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package2, Users, CalendarDays, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Matériel', href: '/sonorisation/materiel', icon: Package2 },
  { label: 'Équipe',   href: '/sonorisation/equipe',   icon: Users },
  { label: 'Planning', href: '/sonorisation/planning', icon: CalendarDays },
] as const

const PAGE_LABELS: Record<string, string> = {
  '/sonorisation/materiel': 'Matériel',
  '/sonorisation/equipe':   'Équipe',
  '/sonorisation/planning': 'Planning',
}

export function SonoBreadcrumb() {
  const pathname = usePathname()
  const label = PAGE_LABELS[pathname]

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground leading-none">
      <Link href="/sonorisation" className="hover:text-foreground transition-colors">
        Sonorisation
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

export function SonoNavTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex -mb-px" aria-label="Modules sonorisation">
      {TABS.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
