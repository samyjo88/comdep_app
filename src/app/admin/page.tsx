import { redirect }         from 'next/navigation'
import Link                  from 'next/link'
import { createClient }      from '@/lib/supabase/server'
import type { Metadata }     from 'next'
import type { AppRole }      from '@/lib/supabase/types'
import {
  Settings, Users, Shield, Bell, Palette,
  ChevronRight, User, Lock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Paramètres' }

const ROLE_CFG: Record<AppRole, { label: string; cls: string; dot: string }> = {
  super_admin: {
    label: 'Super Admin',
    cls:   'bg-red-100    dark:bg-red-900/40    text-red-700    dark:text-red-300    border-red-200    dark:border-red-800',
    dot:   'bg-red-500',
  },
  admin: {
    label: 'Admin',
    cls:   'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    dot:   'bg-purple-500',
  },
  responsable: {
    label: 'Responsable',
    cls:   'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300   border-blue-200   dark:border-blue-800',
    dot:   'bg-blue-500',
  },
  redacteur: {
    label: 'Rédacteur',
    cls:   'bg-amber-100  dark:bg-amber-900/40  text-amber-700  dark:text-amber-300  border-amber-200  dark:border-amber-800',
    dot:   'bg-amber-500',
  },
  membre: {
    label: 'Membre',
    cls:   'bg-slate-100  dark:bg-slate-800/60  text-slate-700  dark:text-slate-300  border-slate-200  dark:border-slate-700',
    dot:   'bg-slate-400',
  },
}

interface SettingSection {
  label:   string
  cards:   SettingCard[]
}

interface SettingCard {
  href:        string
  icon:        React.ElementType
  iconBg:      string
  iconColor:   string
  accentColor: string
  title:       string
  description: string
  adminOnly:   boolean
}

const SECTIONS: SettingSection[] = [
  {
    label: 'Personnel',
    cards: [
      {
        href:        '/profil',
        icon:        User,
        iconBg:      'bg-emerald-50 dark:bg-emerald-950/50',
        iconColor:   'text-emerald-600 dark:text-emerald-400',
        accentColor: 'group-hover:border-l-emerald-500',
        title:       'Mon profil',
        description: 'Informations personnelles, mot de passe et notifications e-mail',
        adminOnly:   false,
      },
    ],
  },
  {
    label: 'Administration',
    cards: [
      {
        href:        '/admin/membres',
        icon:        Users,
        iconBg:      'bg-purple-50 dark:bg-purple-950/50',
        iconColor:   'text-purple-600 dark:text-purple-400',
        accentColor: 'group-hover:border-l-purple-500',
        title:       'Gestion des membres',
        description: 'Inviter des membres, gérer les rôles et désactiver des comptes',
        adminOnly:   true,
      },
    ],
  },
]

export default async function AdminPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [profileRes, roleRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('prenom, nom')
      .eq('id', user.id)
      .single(),
    supabase.rpc('get_my_role'),
  ])

  const profile = profileRes.data
  const role: AppRole = roleRes.data ?? 'membre'
  const isAdmin = role === 'super_admin' || role === 'admin'
  const roleCfg = ROLE_CFG[role]

  const displayName = profile ? `${profile.prenom} ${profile.nom}` : (user.email ?? '')
  const initials    = profile
    ? `${profile.prenom?.[0] ?? ''}${profile.nom?.[0] ?? ''}`.toUpperCase()
    : (user.email?.[0] ?? '?').toUpperCase()

  const visibleSections = SECTIONS
    .map(s => ({ ...s, cards: s.cards.filter(c => !c.adminOnly || isAdmin) }))
    .filter(s => s.cards.length > 0)

  return (
    <div className="min-h-full">

      {/* Bannière en-tête */}
      <div className="border-b bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-900/60 px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4">

            {/* Avatar avec initiales */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-400 flex items-center justify-center shadow-md">
                <span className="text-lg font-bold text-white dark:text-slate-900 tracking-tight">
                  {initials}
                </span>
              </div>
              <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${roleCfg.dot}`} />
            </div>

            {/* Infos utilisateur */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight truncate">{displayName}</h1>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>

            {/* Badge rôle */}
            <Badge className={`shrink-0 text-xs font-semibold border px-2.5 py-1 ${roleCfg.cls}`}>
              {roleCfg.label}
            </Badge>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800">
              <Settings className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            </div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Paramètres
            </h2>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {visibleSections.map(section => (
          <div key={section.label}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
              {section.label}
            </p>

            <div className="rounded-xl border bg-card overflow-hidden divide-y">
              {section.cards.map(({ href, icon: Icon, iconBg, iconColor, accentColor, title, description, adminOnly }) => (
                <Link
                  key={href}
                  href={href}
                  className={[
                    'group flex items-center gap-4 px-5 py-4 transition-colors',
                    'hover:bg-accent/50',
                    'border-l-4 border-l-transparent',
                    accentColor,
                  ].join(' ')}
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${iconBg}`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{title}</span>
                      {adminOnly && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded-full">
                          <Lock className="h-2.5 w-2.5" />
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{description}</p>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* À propos */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
            À propos
          </p>
          <div className="rounded-xl border bg-card divide-y overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/60 shrink-0">
                <Palette className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">ComDept</p>
                <p className="text-xs text-muted-foreground">Département de communication</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-5 py-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/60 shrink-0">
                <Bell className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">Notifications</p>
                <p className="text-xs text-muted-foreground">Alertes et rappels en temps réel</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
