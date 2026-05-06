'use client'

import { useState, useEffect, useCallback, type ElementType } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/supabase/types'
import {
  Bell, BellRing, Volume2, Monitor, Megaphone, Video, Share2,
  CheckCheck, ExternalLink, X,
} from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
  SheetBody, SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ── Config visuelle par module ─────────────────────────────────────────────

interface ModuleCfg { icon: ElementType; couleur: string; bg: string }

const MODULE_CFG: Record<string, ModuleCfg> = {
  son:        { icon: Volume2,  couleur: 'text-blue-600',   bg: 'bg-blue-50'   },
  projection: { icon: Monitor,  couleur: 'text-purple-600', bg: 'bg-purple-50' },
  annonces:   { icon: Megaphone,couleur: 'text-amber-600',  bg: 'bg-amber-50'  },
  captation:  { icon: Video,    couleur: 'text-red-600',    bg: 'bg-red-50'    },
  cm:         { icon: Share2,   couleur: 'text-green-600',  bg: 'bg-green-50'  },
  general:    { icon: BellRing, couleur: 'text-slate-600',  bg: 'bg-slate-100' },
}

// ── Temps relatif ──────────────────────────────────────────────────────────

function tempsRelatif(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return "À l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const j = Math.floor(h / 24)
  if (j < 7)  return `il y a ${j}j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ── Composant ──────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen]                   = useState(false)
  // stable client reference — createBrowserClient is internally singleton-safe
  const [supabase]                        = useState(() => createClient())

  // ── Chargement initial + abonnement Realtime ───────────────────────────

  const setup = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { user } } = await (supabase as any).auth.getUser()
    if (!user) return null

    // Fetch initial
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('notifications')
      .select('id, module, titre, message, lu, lien, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setNotifications((data as Notification[]) ?? [])

    // Abonnement Realtime filtré sur user_id pour ne recevoir
    // que ses propres notifications sans surcharge serveur
    const channel = supabase
      .channel(`notifs:${user.id}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, {
        event:  '*',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${user.id}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setNotifications(prev => [payload.new as Notification, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setNotifications(prev =>
            prev.map(n => n.id === payload.new.id ? (payload.new as Notification) : n)
          )
        } else if (payload.eventType === 'DELETE') {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
        }
      })
      .subscribe()

    return channel
  }, [supabase])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null
    setup().then(ch => { channel = ch })
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [setup, supabase])

  // ── Actions ────────────────────────────────────────────────────────────

  const marquerLu = useCallback(async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('notifications')
      .update({ lu: true })
      .eq('id', id)
    // La mise à jour Realtime va propager le changement, mais on l'applique
    // localement immédiatement pour éviter la latence perçue
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n))
  }, [supabase])

  const marquerToutLu = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { user } } = await (supabase as any).auth.getUser()
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('notifications')
      .update({ lu: true })
      .eq('user_id', user.id)
      .eq('lu', false)
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })))
  }, [supabase])

  // ── Dérivés ────────────────────────────────────────────────────────────

  const nonLues = notifications.filter(n => !n.lu).length

  // ── Rendu ──────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* ── Bouton cloche ── */}
      <SheetTrigger asChild>
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={nonLues > 0 ? `${nonLues} notifications non lues` : 'Notifications'}
        >
          <Bell className="h-5 w-5" />
          {nonLues > 0 && (
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none"
            >
              {nonLues > 99 ? '99+' : nonLues}
            </span>
          )}
        </button>
      </SheetTrigger>

      {/* ── Panneau ── */}
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="flex items-center gap-2 flex-1">
              <Bell className="h-4 w-4 shrink-0" />
              Notifications
            </SheetTitle>
            {nonLues > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs">
                {nonLues} non lue{nonLues > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <SheetBody className="px-0 py-0">
          {notifications.length === 0 ? (
            /* ── État vide ── */
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mb-4">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold">Tout est à jour</p>
              <p className="text-xs text-muted-foreground mt-1">
                Aucune notification pour le moment
              </p>
            </div>
          ) : (
            /* ── Liste ── */
            <ul className="divide-y">
              {notifications.map(notif => {
                const cfg  = MODULE_CFG[notif.module] ?? MODULE_CFG.general
                const Icon = cfg.icon

                const inner = (
                  <div className={cn(
                    'flex items-start gap-3 px-6 py-4',
                    !notif.lu && 'bg-primary/[0.035]',
                  )}>
                    {/* Icône module */}
                    <div className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${cfg.bg}`}>
                      <Icon className={`h-4 w-4 ${cfg.couleur}`} />
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm leading-snug', !notif.lu && 'font-semibold')}>
                          {notif.titre}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          {!notif.lu && (
                            <span aria-hidden className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                          )}
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {tempsRelatif(notif.created_at)}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {notif.message}
                      </p>

                      {notif.lien && (
                        <div className="flex items-center gap-1 text-xs text-primary mt-0.5">
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span>Voir le détail</span>
                        </div>
                      )}
                    </div>

                    {/* Bouton fermer (marquer lu) si non lu + pas de lien */}
                    {!notif.lu && !notif.lien && (
                      <button
                        onClick={e => { e.stopPropagation(); marquerLu(notif.id) }}
                        className="shrink-0 mt-0.5 rounded-md p-1 hover:bg-muted transition-colors opacity-60 hover:opacity-100"
                        aria-label="Marquer comme lu"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )

                return (
                  <li key={notif.id}>
                    {notif.lien ? (
                      <Link
                        href={notif.lien}
                        className="block hover:bg-muted/30 transition-colors"
                        onClick={() => {
                          if (!notif.lu) marquerLu(notif.id)
                          setOpen(false)
                        }}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div>{inner}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </SheetBody>

        {/* ── Pied de panneau ── */}
        {notifications.length > 0 && (
          <SheetFooter>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs h-9"
              onClick={marquerToutLu}
              disabled={nonLues === 0}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tout marquer comme lu
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
