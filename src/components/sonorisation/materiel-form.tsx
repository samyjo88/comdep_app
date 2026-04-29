'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { ajouterMateriel, type MaterielFormState } from '@/lib/sonorisation/actions'
import { CATEGORIES, STATUTS } from '@/lib/sonorisation/constants'
import { useState } from 'react'

const initialState: MaterielFormState = {}

export function MaterielForm() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(ajouterMateriel, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) {
      setOpen(false)
      formRef.current?.reset()
    }
  }, [state.success])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Ajouter du matériel
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter du matériel</DialogTitle>
        </DialogHeader>

        <form ref={formRef} action={action} className="space-y-4">
          {/* Nom + Catégorie */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="nom">Nom <span className="text-destructive">*</span></Label>
              <Input id="nom" name="nom" placeholder="ex: Shure SM58" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="categorie">Catégorie</Label>
              <select
                id="categorie"
                name="categorie"
                defaultValue="autre"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="statut">Statut</Label>
              <select
                id="statut"
                name="statut"
                defaultValue="disponible"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {STATUTS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Marque + Modèle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="marque">Marque</Label>
              <Input id="marque" name="marque" placeholder="ex: Shure" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modele">Modèle</Label>
              <Input id="modele" name="modele" placeholder="ex: SM58" />
            </div>
          </div>

          {/* Référence + N° de série */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="reference">Référence interne</Label>
              <Input id="reference" name="reference" placeholder="ex: SONO-001" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numero_serie">N° de série</Label>
              <Input id="numero_serie" name="numero_serie" />
            </div>
          </div>

          {/* Localisation + Date acquisition */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="localisation">Localisation</Label>
              <Input id="localisation" name="localisation" placeholder="ex: Salle de culte" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date_acquisition">Date d&apos;acquisition</Label>
              <Input id="date_acquisition" name="date_acquisition" type="date" />
            </div>
          </div>

          {/* Valeur d'achat */}
          <div className="space-y-1.5">
            <Label htmlFor="valeur_achat">Valeur d&apos;achat (€)</Label>
            <Input id="valeur_achat" name="valeur_achat" type="number" min="0" step="0.01" placeholder="0.00" />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Informations complémentaires..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
