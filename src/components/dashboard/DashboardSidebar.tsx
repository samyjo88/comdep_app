'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CheckSquare, Calendar, BarChart2, Users,
  Settings, HelpCircle, Volume2, Megaphone, Video, Share2,
} from 'lucide-react'
import { CalendrierMini } from './CalendrierMini'

const MENU_ITEMS = [
  { label: 'Dashboard',  href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Tâches',     href: '/dashboard#taches',    icon: CheckSquare },
  { label: 'Calendrier', href: '/dashboard#calendrier', icon: Calendar },
  { label: 'Analytique', href: '/dashboard#stats',      icon: BarChart2 },
  { label: 'Équipe',     href: '/dashboard#equipe',     icon: Users },
]

const MODULES = [
  { label: 'Sonorisation', href: '/sonorisation', icon: Volume2,   color: 'text-blue-500'   },
  { label: 'Annonces',     href: '/annonces',     icon: Megaphone, color: 'text-amber-500'  },
  { label: 'Captation',    href: '/captation',    icon: Video,     color: 'text-red-500'    },
  { label: 'Community',    href: '/community',    icon: Share2,    color: 'text-green-500'  },
]

const GENERAL_ITEMS = [
  { label: 'Paramètres', href: '/admin',  icon: Settings   },
  { label: 'Aide',       href: '#',       icon: HelpCircle },
]

interface Props {
  cultesDates: string[]
}

export function DashboardSidebar({ cultesDates }: Props) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r bg-card overflow-y-auto">
      {/* Navigation */}
      <nav className="flex-1 px-3 pt-5 pb-4 space-y-6">

        {/* Menu principal */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 mb-2">
            Menu
          </p>
          <div className="space-y-0.5">
            {MENU_ITEMS.map(({ label, href, icon: Icon }) => {
              const active = href === '/dashboard'
                ? pathname === '/dashboard'
                : false
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-l-[3px] border-emerald-600'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground border-l-[3px] border-transparent',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Modules */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 mb-2">
            Modules
          </p>
          <div className="space-y-0.5">
            {MODULES.map(({ label, href, icon: Icon, color }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-[3px]',
                    active
                      ? 'bg-accent text-foreground border-emerald-600'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground border-transparent',
                  ].join(' ')}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Général */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 mb-2">
            Général
          </p>
          <div className="space-y-0.5">
            {GENERAL_ITEMS.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border-l-[3px] border-transparent"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>

      </nav>

      {/* Mini-calendrier des cultes */}
      <div className="border-t px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Calendrier des cultes
        </p>
        <CalendrierMini cultesDates={cultesDates} />
      </div>
    </aside>
  )
}
