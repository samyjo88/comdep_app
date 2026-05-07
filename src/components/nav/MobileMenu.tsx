'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, LayoutDashboard, Volume2, Monitor, Megaphone, Video, Share2 } from 'lucide-react'

const MODULES = [
  { label: 'Vue d\'ensemble',       href: '/dashboard',    icon: LayoutDashboard, colour: 'text-primary' },
  { label: 'Sonorisation',          href: '/sonorisation', icon: Volume2,          colour: 'text-blue-600' },
  { label: 'Projection / Proclaim', href: '/projection',   icon: Monitor,          colour: 'text-purple-600' },
  { label: 'Annonces',              href: '/annonces',     icon: Megaphone,        colour: 'text-amber-600' },
  { label: 'Captation Vidéo',       href: '/captation',    icon: Video,            colour: 'text-red-600' },
  { label: 'Community Management',  href: '/community',    icon: Share2,           colour: 'text-green-600' },
]

export function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={open}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown panel */}
          <div className="fixed top-12 left-0 right-0 z-50 bg-card border-b shadow-lg">
            <nav className="container mx-auto max-w-7xl px-4 py-1 divide-y divide-border/60">
              {MODULES.map(({ label, href, icon: Icon, colour }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 py-3.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon className={`h-4 w-4 shrink-0 ${colour}`} />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </div>
  )
}
