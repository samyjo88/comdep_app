'use client'

import { useState, useTransition } from 'react'
import { UserPlus, Loader2, Mail, KeyRound } from 'lucide-react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  ajouterMembre,
  creerMembreAvecMotDePasse,
  type Departement,
} from '@/lib/dashboard/team-actions'
import { toast } from 'sonner'

type Mode = 'invitation' | 'direct'

const DEPARTEMENTS: { value: Departement; label: string }[] = [
  { value: 'son',        label: 'Sonorisation' },
  { value: 'captation',  label: 'Captation Vidéo' },
  { value: 'community',  label: 'Community Management' },
  { value: 'annonces',   label: 'Annonces' },
  { value: 'projection', label: 'Projection' },
]

export function AjouterMembreDialog() {
  const [open, setOpen]              = useState(false)
  const [mode, setMode]              = useState<Mode>('invitation')
  const [dept, setDept]              = useState<Departement>('son')
  const [isPending, startTransition] = useTransition()

  function resetAndClose() {
    setOpen(false)
    setMode('invitation')
    setDept('son')
  }

  function handleInviteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await ajouterMembre({
        prenom:      fd.get('prenom') as string,
        nom:         fd.get('nom') as string,
        email:       fd.get('email') as string,
        telephone:   (fd.get('telephone') as string) || null,
        departement: dept,
      })
      if (result.error) {
        toast.error('Erreur : ' + result.error)
      } else {
        toast.success('Membre ajouté — invitation envoyée par email ✉️')
        resetAndClose()
      }
    })
  }

  function handleDirectSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd       = new FormData(e.currentTarget)
    const password = fd.get('password') as string
    const confirm  = fd.get('confirm') as string
    if (password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    startTransition(async () => {
      const result = await creerMembreAvecMotDePasse({
        prenom:      fd.get('prenom') as string,
        nom:         fd.get('nom') as string,
        email:       fd.get('email') as string,
        telephone:   (fd.get('telephone') as string) || null,
        departement: dept,
        password,
      })
      if (result.error) {
        toast.error('Erreur : ' + result.error)
      } else {
        toast.success('Membre créé avec succès ✓')
        resetAndClose()
      }
    })
  }

  const commonFields = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="prenom">Prénom *</Label>
          <Input id="prenom" name="prenom" required placeholder="Jean" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nom">Nom *</Label>
          <Input id="nom" name="nom" required placeholder="Dupont" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email *</Label>
        <Input id="email" name="email" type="email" required placeholder="jean@mail.com" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="telephone">Téléphone</Label>
        <Input id="telephone" name="telephone" placeholder="+33 6 00 00 00 00" />
      </div>

      <div className="space-y-1.5">
        <Label>Département *</Label>
        <Select value={dept} onValueChange={v => setDept(v as Departement)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {DEPARTEMENTS.map(d => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetAndClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white">
          <UserPlus className="h-4 w-4" />
          Ajouter un membre
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un membre</DialogTitle>
        </DialogHeader>

        {/* Toggle mode */}
        <div className="flex rounded-lg border bg-muted p-1 gap-1">
          <button
            type="button"
            onClick={() => setMode('invitation')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              mode === 'invitation'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Mail className="h-3.5 w-3.5" />
            Invitation email
          </button>
          <button
            type="button"
            onClick={() => setMode('direct')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              mode === 'direct'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Mot de passe direct
          </button>
        </div>

        {/* ── Mode invitation ── */}
        {mode === 'invitation' && (
          <>
            <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-300">
              <Mail className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Un email d&apos;invitation sera envoyé pour que la personne crée son propre mot de passe.
              </span>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              {commonFields}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={resetAndClose}>Annuler</Button>
                <Button type="submit" disabled={isPending} className="bg-emerald-700 hover:bg-emerald-800 text-white">
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isPending ? 'Envoi…' : 'Ajouter et inviter'}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* ── Mode mot de passe direct ── */}
        {mode === 'direct' && (
          <>
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
              <KeyRound className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Le compte est créé immédiatement. Transmettez le mot de passe à la personne
                en dehors de l&apos;application.
              </span>
            </div>

            <form onSubmit={handleDirectSubmit} className="space-y-4">
              {commonFields}

              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="8 caractères minimum"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmer *</Label>
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={resetAndClose}>Annuler</Button>
                <Button type="submit" disabled={isPending} className="bg-emerald-700 hover:bg-emerald-800 text-white">
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isPending ? 'Création…' : 'Créer le membre'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
