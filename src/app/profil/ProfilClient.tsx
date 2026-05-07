'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  User, Phone, Mail, Shield, Puzzle, Bell, Lock, LogOut,
  Pencil, Check, X, Eye, EyeOff, Volume2, Monitor, Share2, Video,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  updateProfilAction,
  toggleEmailNotificationsAction,
  changePasswordAction,
  signOutAction,
} from './actions'
import type { AppRole, Profile } from '@/lib/supabase/types'

// ── Types ──────────────────────────────────────────────────────────────────

interface Module {
  key: string
  label: string
}

interface ProfilClientProps {
  profile:              Profile
  role:                 AppRole
  modules:              Module[]
  email:                string
}

// ── Config ─────────────────────────────────────────────────────────────────

const ROLE_CFG: Record<AppRole, { label: string; cls: string }> = {
  super_admin: { label: 'Super Admin',  cls: 'bg-red-100    dark:bg-red-900/40    text-red-700    dark:text-red-300    border-red-200    dark:border-red-800'    },
  admin:       { label: 'Admin',        cls: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  responsable: { label: 'Responsable',  cls: 'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300   border-blue-200   dark:border-blue-800'   },
  redacteur:   { label: 'Rédacteur',    cls: 'bg-amber-100  dark:bg-amber-900/40  text-amber-700  dark:text-amber-300  border-amber-200  dark:border-amber-800'  },
  membre:      { label: 'Membre',       cls: 'bg-slate-100  dark:bg-slate-800/60  text-slate-700  dark:text-slate-300  border-slate-200  dark:border-slate-700'  },
}

const MODULE_CFG: Record<string, { icon: React.ElementType; label: string; iconCls: string; bgCls: string }> = {
  son:       { icon: Volume2,  label: 'Sonorisation',          iconCls: 'text-blue-600   dark:text-blue-400',   bgCls: 'bg-blue-50   dark:bg-blue-950/40'   },
  captation: { icon: Video,    label: 'Captation Vidéo',       iconCls: 'text-red-600    dark:text-red-400',    bgCls: 'bg-red-50    dark:bg-red-950/40'    },
  cm:        { icon: Share2,   label: 'Community Management',  iconCls: 'text-green-600  dark:text-green-400',  bgCls: 'bg-green-50  dark:bg-green-950/40'  },
  projection:{ icon: Monitor,  label: 'Projection / Proclaim', iconCls: 'text-purple-600 dark:text-purple-400', bgCls: 'bg-purple-50 dark:bg-purple-950/40' },
}

// ── Composant ──────────────────────────────────────────────────────────────

export function ProfilClient({ profile, role, modules, email }: ProfilClientProps) {
  // ── Infos personnelles ─────────────────────────────────────────────────
  const [editing,    setEditing]    = useState(false)
  const [prenom,     setPrenom]     = useState(profile.prenom)
  const [nom,        setNom]        = useState(profile.nom)
  const [telephone,  setTelephone]  = useState(profile.telephone ?? '')
  const [isPending,  startTransition] = useTransition()

  function handleCancelEdit() {
    setPrenom(profile.prenom)
    setNom(profile.nom)
    setTelephone(profile.telephone ?? '')
    setEditing(false)
  }

  function handleSaveInfo() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('prenom',    prenom)
      fd.set('nom',       nom)
      fd.set('telephone', telephone)
      const result = await updateProfilAction(fd)
      if (result.success) {
        toast.success('Profil mis à jour')
        setEditing(false)
      } else {
        toast.error(result.error ?? 'Erreur lors de la mise à jour')
      }
    })
  }

  // ── Notifications e-mail ───────────────────────────────────────────────
  const [emailNotifs,        setEmailNotifs]        = useState(profile.email_notifications)
  const [notifPending,       startNotifTransition]  = useTransition()

  function handleToggleNotifs(checked: boolean) {
    setEmailNotifs(checked)
    startNotifTransition(async () => {
      const result = await toggleEmailNotificationsAction(checked)
      if (!result.success) {
        setEmailNotifs(!checked)
        toast.error(result.error ?? 'Erreur')
      }
    })
  }

  // ── Mot de passe ───────────────────────────────────────────────────────
  const [showPwd,        setShowPwd]        = useState(false)
  const [showConfirm,    setShowConfirm]    = useState(false)
  const [pwdPending,     startPwdTransition] = useTransition()

  function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startPwdTransition(async () => {
      const result = await changePasswordAction(fd)
      if (result.success) {
        toast.success('Mot de passe mis à jour')
        ;(e.target as HTMLFormElement).reset()
      } else {
        toast.error(result.error ?? 'Erreur')
      }
    })
  }

  // ── Déconnexion ────────────────────────────────────────────────────────
  const [signOutPending, startSignOutTransition] = useTransition()

  function handleSignOut() {
    startSignOutTransition(() => signOutAction())
  }

  // ── Initiales ─────────────────────────────────────────────────────────
  const initiales = `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase() || '?'
  const roleCfg   = ROLE_CFG[role] ?? ROLE_CFG.membre

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* ── Colonne principale ── */}
      <div className="lg:col-span-2 space-y-6">

        {/* Informations personnelles */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Informations personnelles
              </CardTitle>
              {!editing && (
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="prenom" className="text-xs">Prénom</Label>
                    <Input
                      id="prenom"
                      value={prenom}
                      onChange={e => setPrenom(e.target.value)}
                      className="h-9 text-sm"
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nom" className="text-xs">Nom</Label>
                    <Input
                      id="nom"
                      value={nom}
                      onChange={e => setNom(e.target.value)}
                      className="h-9 text-sm"
                      disabled={isPending}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="telephone" className="text-xs">Téléphone</Label>
                  <Input
                    id="telephone"
                    type="tel"
                    value={telephone}
                    onChange={e => setTelephone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className="h-9 text-sm"
                    disabled={isPending}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="gap-1.5 h-8" onClick={handleSaveInfo} disabled={isPending}>
                    <Check className="h-3.5 w-3.5" />
                    {isPending ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleCancelEdit} disabled={isPending}>
                    <X className="h-3.5 w-3.5" />
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <InfoRow icon={User} label="Prénom" value={prenom} />
                <InfoRow icon={User} label="Nom"    value={nom}    />
                <InfoRow
                  icon={Phone}
                  label="Téléphone"
                  value={telephone || '—'}
                  muted={!telephone}
                />
                <InfoRow icon={Mail} label="E-mail" value={email} muted />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications e-mail */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              Notifications e-mail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Recevoir les e-mails</p>
                <p className="text-xs text-muted-foreground">
                  Rappels de culte 48h à l'avance, alertes matériel défaillant
                </p>
              </div>
              <Switch
                checked={emailNotifs}
                onCheckedChange={handleToggleNotifs}
                disabled={notifPending}
                aria-label="Activer les notifications e-mail"
              />
            </div>
          </CardContent>
        </Card>

        {/* Changer le mot de passe */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Changer le mot de passe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="8 caractères minimum"
                    className="h-9 text-sm pr-9"
                    autoComplete="new-password"
                    disabled={pwdPending}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPwd ? 'Masquer' : 'Afficher'}
                  >
                    {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-xs">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    name="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Répétez le mot de passe"
                    className="h-9 text-sm pr-9"
                    autoComplete="new-password"
                    disabled={pwdPending}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirm ? 'Masquer' : 'Afficher'}
                  >
                    {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <Button type="submit" size="sm" className="gap-1.5 h-8 w-full sm:w-auto" disabled={pwdPending}>
                <Lock className="h-3.5 w-3.5" />
                {pwdPending ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>

      {/* ── Colonne latérale ── */}
      <div className="space-y-6">

        {/* Avatar + rôle */}
        <Card>
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold select-none">
              {initiales}
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-base">{prenom} {nom}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{email}</p>
            </div>
            <Badge className={`${roleCfg.cls} gap-1.5 text-xs`}>
              <Shield className="h-3 w-3" />
              {roleCfg.label}
            </Badge>
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-2">
              Le rôle est géré par les administrateurs de l'application.
            </p>
          </CardContent>
        </Card>

        {/* Modules */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Puzzle className="h-4 w-4 text-muted-foreground" />
              Mes modules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {modules.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">
                Aucune affectation à un module détectée.
              </p>
            ) : (
              modules.map(m => {
                const cfg = MODULE_CFG[m.key]
                if (!cfg) return null
                const Icon = cfg.icon
                return (
                  <div key={m.key} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${cfg.bgCls}`}>
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${cfg.iconCls}`} />
                    <span className={`text-xs font-medium ${cfg.iconCls}`}>{cfg.label}</span>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Déconnexion */}
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <LogOut className="h-4 w-4 text-muted-foreground" />
              Session
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 h-9 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/60 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
              onClick={handleSignOut}
              disabled={signOutPending}
            >
              <LogOut className="h-3.5 w-3.5" />
              {signOutPending ? 'Déconnexion…' : 'Se déconnecter'}
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

// ── Petite ligne de lecture ────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  muted = false,
}: {
  icon: React.ElementType
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <span className={`text-sm ${muted ? 'text-muted-foreground' : 'font-medium'}`}>{value}</span>
    </div>
  )
}
