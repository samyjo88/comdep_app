'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Church, LayoutDashboard } from 'lucide-react'
import { modulesVisibles, estActif } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface Props {
  modulesAccessibles: string[] | null
}

/** Barre de navigation en bas d'écran, sur mobile et tablette. */
export function MobileBottomNav({ modulesAccessibles }: Props) {
  const pathname = usePathname()
  const items = [
    { key: undefined, label: 'Accueil', href: '/dashboard', icon: LayoutDashboard },
    ...(modulesAccessibles === null || modulesAccessibles.length > 0
      ? [{ key: undefined, label: 'Cultes', href: '/cultes', icon: Church }]
      : []),
    ...modulesVisibles(modulesAccessibles).map(m => ({
      key: m.key as string | undefined, label: m.court, href: m.href, icon: m.icon,
    })),
  ]

  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden print:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map(({ key, label, href, icon: Icon }) => {
          const actif = href === '/dashboard' ? pathname.startsWith('/dashboard') : estActif(pathname, href)
          return (
            <li key={href} className="flex-1" data-module={key}>
              <Link
                href={href}
                aria-current={actif ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-2 text-[10.5px] font-medium transition-colors',
                  actif ? 'text-module' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200',
                    actif ? 'scale-105 bg-module/15' : 'bg-transparent',
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="max-w-full truncate px-1">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
