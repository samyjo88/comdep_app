'use client'

import { useState, useTransition } from 'react'
import { Shield, UserPlus, Mail, RotateCcw, Ban, CheckCircle, ChevronDown } from 'lucide-react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Badge }    from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  inviteMemberAction,
  updateRoleAction,
  disableMemberAction,
  enableMemberAction,
  resetPasswordAction,
} from './actions'
import type { AppRole } from '@/lib/supabase/types'

interface Membre {
  id:      string
  prenom:  string
  nom:     string
  email:   string
  role:    AppRole | null
  actif:   boolean
}

const ROLES: { value: AppRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin',       label: 'Admin'       },
  { value: 'responsable', label: 'Responsable' },
  { value: 'redacteur',   label: 'Rédacteur'   },
  { value: 'membre',      label: 'Membre'      },
]

const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  admin:       'bg-blue-100   text-blue-800   dark:bg-blue-900/40   dark:text-blue-300',
  responsable: 'bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300',
  redacteur:   'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  membre:      'bg-gray-100   text-gray-700   dark:bg-gray-800      dark:text-gray-300',
}

function RoleBadge({ role }: { role: AppRole | null }) {
  if (!role) return <span className="text-muted-foreground text-xs">—</span>
  const label = ROLES.find(r => r.value === role)?.label ?? role
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[role]}`}>
      {label}
    </span>
  )
}

function InviteDialog() {
  const [open, setOpen]       = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const [pending, start]      = useTransition()

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError('')
    start(async () => {
      const res = await inviteMemberAction(fd)
      if (res.error) { setError(res.error); return }
      setSuccess(true)
      setTimeout(() => { setOpen(false); setSuccess(false) }, 1500)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Inviter un membre
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter un nouveau membre</DialogTitle>
        </DialogHeader>
        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium">Invitation envoyée !</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Prénom</label>
                <Input name="prenom" placeholder="Jean" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nom</label>
                <Input name="nom" placeholder="Dupont" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Adresse e-mail</label>
              <Input name="email" type="email" placeholder="jean.dupont@email.com" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rôle initial</label>
              <select
                name="role"
                defaultValue="membre"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Envoi…' : 'Envoyer l\'invitation'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RoleSelector({ membre }: { membre: Membre }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState('')

  function changeRole(role: AppRole) {
    const fd = new FormData()
    fd.set('userId', membre.id)
    fd.set('role', role)
    setError('')
    start(async () => {
      const res = await updateRoleAction(fd)
      if (res.error) setError(res.error)
    })
  }

  return (
    <div className="space-y-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1 rounded hover:opacity-80 transition-opacity" disabled={pending}>
            <RoleBadge role={membre.role} />
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {ROLES.map(r => (
            <DropdownMenuItem
              key={r.value}
              onClick={() => changeRole(r.value)}
              className={membre.role === r.value ? 'font-semibold' : ''}
            >
              {r.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function MemberActions({ membre }: { membre: Membre }) {
  const [pending, start] = useTransition()
  const [feedback, setFeedback] = useState('')

  function run(action: (fd: FormData) => Promise<{ error?: string }>, extra?: Record<string, string>) {
    const fd = new FormData()
    fd.set('userId', membre.id)
    fd.set('email',  membre.email)
    if (extra) Object.entries(extra).forEach(([k, v]) => fd.set(k, v))
    setFeedback('')
    start(async () => {
      const res = await action(fd)
      if (res.error) setFeedback(res.error)
      else setFeedback(membre.actif ? 'Compte désactivé' : 'Compte réactivé')
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        disabled={pending}
        onClick={() => run(resetPasswordAction)}
        title="Envoyer un e-mail de réinitialisation"
      >
        <Mail className="h-3.5 w-3.5" />
        Réinit.
      </Button>

      {membre.actif ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          disabled={pending}
          onClick={() => run(disableMemberAction)}
          title="Désactiver le compte"
        >
          <Ban className="h-3.5 w-3.5" />
          Désactiver
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-green-600 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
          disabled={pending}
          onClick={() => run(enableMemberAction)}
          title="Réactiver le compte"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Réactiver
        </Button>
      )}

      {feedback && <span className="text-xs text-muted-foreground">{feedback}</span>}
    </div>
  )
}

export function MembresAdminClient({ membres }: { membres: Membre[] }) {
  const [search, setSearch] = useState('')

  const filtered = membres.filter(m => {
    const q = search.toLowerCase()
    return (
      m.prenom.toLowerCase().includes(q) ||
      m.nom.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Input
            placeholder="Rechercher un membre…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-3"
          />
        </div>
        <InviteDialog />
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Membre</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rôle</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun membre trouvé
                </td>
              </tr>
            )}
            {filtered.map(m => (
              <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{m.prenom} {m.nom}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </td>
                <td className="px-4 py-3">
                  <RoleSelector membre={m} />
                </td>
                <td className="px-4 py-3">
                  {m.actif ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20">
                      Actif
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Désactivé
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <MemberActions membre={m} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">{membres.length} membre{membres.length > 1 ? 's' : ''} au total</p>
    </div>
  )
}
