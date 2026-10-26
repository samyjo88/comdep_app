import { redirect }         from 'next/navigation'
import Link                  from 'next/link'
import { createClient }      from '@/lib/supabase/server'
import type { Metadata }     from 'next'
import type { AppRole }      from '@/lib/supabase/types'
import {
  Settings, Users, Shield, Bell, Palette,
  ChevronRight, User,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge }             from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Paramètres' }

const ROLE_CFG: Record<AppRole, { label: string; cls: string }> = {
  super_admin: { label: 'Super Admin',  cls: 'bg-danger/15    dark:bg-danger/5    text-danger    dark:text-danger'    },
  admin:       { label: 'Admin',        cls: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
  responsable: { label: 'Responsable',  cls: 'bg-info/15   dark:bg-info/5   text-info   dark:text-info'   },
  redacteur:   { label: 'Rédacteur',    cls: 'bg-warning/15  dark:bg-warning/5  text-warning  dark:text-warning'  },
  membre:      { label: 'Membre',       cls: 'bg-muted  dark:bg-muted  text-foreground  dark:text-muted-foreground'  },
}

interface SettingCard {
  href:        string
  icon:        React.ElementType
  iconBg:      string
  iconColor:   string
  title:       string
  description: string
  adminOnly:   boolean
}

const SETTING_CARDS: SettingCard[] = [
  {
    href:        '/profil',
    icon:        User,
    iconBg:      'bg-success/10 dark:bg-success/5',
    iconColor:   'text-success dark:text-success',
    title:       'Mon profil',
    description: 'Informations personnelles, mot de passe et notifications e-mail',
    adminOnly:   false,
  },
  {
    href:        '/admin/membres',
    icon:        Users,
    iconBg:      'bg-purple-50 dark:bg-purple-950/40',
    iconColor:   'text-purple-600 dark:text-purple-400',
    title:       'Gestion des membres',
    description: 'Inviter des membres, gérer les rôles et désactiver des comptes',
    adminOnly:   true,
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

  const visibleCards = SETTING_CARDS.filter(c => !c.adminOnly || isAdmin)

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">

      {/* En-tête */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted dark:bg-muted">
            <Settings className="h-5 w-5 text-muted-foreground dark:text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Paramètres</h1>
            <p className="text-sm text-muted-foreground">
              {profile ? `${profile.prenom} ${profile.nom}` : user.email}
            </p>
          </div>
        </div>
        <Badge className={`text-xs font-medium border ${roleCfg.cls}`}>
          {roleCfg.label}
        </Badge>
      </div>

      {/* Cartes de navigation */}
      <div className="space-y-3">
        {visibleCards.map(({ href, icon: Icon, iconBg, iconColor, title, description, adminOnly }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${iconBg}`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{title}</p>
                    {adminOnly && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 dark:text-purple-400">
                        <Shield className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Informations de l'application */}
      <div className="mt-10 pt-6 border-t">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          À propos
        </p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Palette className="h-3.5 w-3.5" />
            <span>ComDept — Département de communication</span>
          </div>
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5" />
            <span>Notifications et alertes en temps réel</span>
          </div>
        </div>
      </div>

    </div>
  )
}
