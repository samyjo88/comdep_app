'use client'

import { useState, useTransition } from 'react'
import { UserPlus, Loader2, Mail } from 'lucide-react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ajouterMembre, type Departement } from '@/lib/dashboard/team-actions'
import { toast } from 'sonner'

export function AjouterMembreDialog() {
  const [open, setOpen]              = useState(false)
  const [dept, setDept]              = useState<Departement>('son')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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

        {/* Note invitation */}
        <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-300">
          <Mail className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Un email d&apos;invitation sera envoyé à la personne pour qu&apos;elle crée son mot de passe
            et accède à l&apos;application.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
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
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="jean@mail.com"
            />
            <p className="text-[11px] text-muted-foreground">
              Utilisé pour l&apos;invitation et la connexion à l&apos;application.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="telephone">Téléphone</Label>
            <Input id="telephone" name="telephone" placeholder="+33 6 00 00 00 00" />
          </div>

          <div className="space-y-1.5">
            <Label>Département *</Label>
            <Select value={dept} onValueChange={v => setDept(v as Departement)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="son">Sonorisation</SelectItem>
                <SelectItem value="captation">Captation Vidéo</SelectItem>
                <SelectItem value="community">Community Management</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isPending ? 'Envoi en cours…' : 'Ajouter et inviter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
