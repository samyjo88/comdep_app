'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { NAV_GENERAL, NAV_COMPTE, modulesVisibles, estActif } from '@/lib/navigation'
import { ouvrirPalette } from '@/components/nav/CommandPalette'
import { cn } from '@/lib/utils'

interface Props {
  modulesAccessibles: string[] | null
  estAdmin:           boolean
}

const lienBase =
  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors'

export function AppSidebar({ modulesAccessibles, estAdmin }: Props) {
  const pathname = usePathname()
  const modules  = modulesVisibles(modulesAccessibles)

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-card lg:flex print:hidden">
      <Link
        href="/dashboard"
        className="flex h-16 shrink-0 items-center border-b px-5 transition-opacity hover:opacity-80"
      >
        <BrandMark taille={34} />
      </Link>

      <div className="px-3 pt-4">
        <button
          type="button"
          onClick={ouvrirPalette}
          className="flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Rechercher…</span>
          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Navigation principale">
        <div className="space-y-0.5">
          {NAV_GENERAL.map(({ label, href, icon: Icon }) => {
            const actif = estActif(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={actif ? 'page' : undefined}
                className={cn(
                  lienBase,
                  actif
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </div>

        {modules.length > 0 && (
          <div>
            <p className="mb-2 px-3 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Modules
            </p>
            <div className="space-y-0.5">
              {modules.map(({ key, label, href, icon: Icon, pages }) => {
                const actif = estActif(pathname, href)
                return (
                  <div key={key} data-module={key}>
                    <Link
                      href={href}
                      aria-current={pathname === href ? 'page' : undefined}
                      className={cn(
                        lienBase,
                        actif
                          ? 'bg-module/10 text-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
                          actif ? 'bg-module text-white dark:text-background' : 'bg-module/10 text-module group-hover:bg-module/15',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {label}
                    </Link>

                    {actif && (
                      <div className="ml-[26px] mt-1 space-y-0.5 border-l-2 border-module/30 pl-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        {pages.map(p => {
                          const sousActif = estActif(pathname, p.href)
                          return (
                            <Link
                              key={p.href}
                              href={p.href}
                              aria-current={sousActif ? 'page' : undefined}
                              className={cn(
                                'block rounded-md px-2 py-1.5 text-[13px] transition-colors',
                                sousActif
                                  ? 'font-semibold text-module'
                                  : 'text-muted-foreground hover:text-foreground',
                              )}
                            >
                              {p.label}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 px-3 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Compte
          </p>
          <div className="space-y-0.5">
            {NAV_COMPTE.filter(l => !l.adminOnly || estAdmin).map(({ label, href, icon: Icon }) => {
              const actif = estActif(pathname, href)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={actif ? 'page' : undefined}
                  className={cn(
                    lienBase,
                    actif
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      <div className="border-t px-5 py-4">
        <div className="h-1 w-full rounded-full bg-gradient-to-r from-brand-green-light via-brand-green to-brand-gold" />
        <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
          Église Méthodiste de Côte d&apos;Ivoire
        </p>
      </div>
    </aside>
  )
}
