import {
  LayoutDashboard, CalendarDays, Volume2, Monitor, Megaphone, Video, Share2,
  Settings, UserCircle, UsersRound, type LucideIcon,
} from 'lucide-react'
import type { ModuleCode } from '@/lib/auth/guards'

export interface NavLien {
  label: string
  href:  string
}

export interface NavModule {
  key:      ModuleCode
  label:    string
  court:    string        // libellé court (barre mobile)
  href:     string
  icon:     LucideIcon
  pages:    NavLien[]
}

export const NAV_GENERAL = [
  { label: 'Tableau de bord',    href: '/dashboard',                    icon: LayoutDashboard },
  { label: 'Planning dimanche',  href: '/dashboard/planning-dimanche',  icon: CalendarDays },
] as const

export const NAV_MODULES: NavModule[] = [
  {
    key: 'son', label: 'Sonorisation', court: 'Son', href: '/sonorisation', icon: Volume2,
    pages: [
      { label: 'Inventaire', href: '/sonorisation/inventaire' },
      { label: 'Matériel',   href: '/sonorisation/materiel' },
      { label: 'Équipe',     href: '/sonorisation/equipe' },
      { label: 'Planning',   href: '/sonorisation/planning' },
    ],
  },
  {
    key: 'projection', label: 'Projection & Proclaim', court: 'Projection', href: '/projection', icon: Monitor,
    pages: [
      { label: 'Cantiques', href: '/projection/cantiques' },
      { label: 'Setlists',  href: '/projection/setlists' },
      { label: 'Planning',  href: '/projection/planning' },
      { label: 'Équipe',    href: '/projection/equipe' },
    ],
  },
  {
    key: 'annonces', label: 'Annonces', court: 'Annonces', href: '/annonces', icon: Megaphone,
    pages: [
      { label: 'Nouveau culte',    href: '/annonces/nouveau' },
      { label: 'Historique',       href: '/annonces/historique' },
      { label: 'Suivi reconduite', href: '/annonces/suivi' },
      { label: 'Équipe',           href: '/annonces/equipe' },
    ],
  },
  {
    key: 'captation', label: 'Captation & Médias', court: 'Captation', href: '/captation', icon: Video,
    pages: [
      { label: 'Planning',    href: '/captation/planning' },
      { label: 'Équipe',      href: '/captation/equipe' },
      { label: 'Médiathèque', href: '/captation/mediatheque' },
    ],
  },
  {
    key: 'community', label: 'Community Management', court: 'Community', href: '/community', icon: Share2,
    pages: [
      { label: 'Planning', href: '/community/planning' },
      { label: 'Posts',    href: '/community/posts' },
      { label: 'Idées',    href: '/community/idees' },
      { label: 'Rapports', href: '/community/rapports' },
    ],
  },
]

export const NAV_COMPTE = [
  { label: 'Mon profil',  href: '/profil',        icon: UserCircle, adminOnly: false },
  { label: 'Paramètres',  href: '/admin',         icon: Settings,   adminOnly: false },
  { label: 'Membres',     href: '/admin/membres', icon: UsersRound, adminOnly: true  },
] as const

/** Modules visibles : null = tous (rôles transverses). */
export function modulesVisibles(accessibles: string[] | null): NavModule[] {
  return accessibles === null
    ? NAV_MODULES
    : NAV_MODULES.filter(m => accessibles.includes(m.key))
}

export function estActif(pathname: string, href: string): boolean {
  if (href === '/dashboard' || href === '/admin') return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}
