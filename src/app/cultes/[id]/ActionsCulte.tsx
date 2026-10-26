'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { BellRing, Loader2, Pencil, Plus, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ChampsEquipe } from '@/components/cultes/ChampsEquipe'
import { designerEquipe, preparerModule, relancerEquipes } from '../actions'
import type { MembreResume } from '@/types/cultes'

type ModuleEquipe = 'son' | 'captation' | 'projection'

interface EditeurProps {
  culteId:   string
  module:    ModuleEquipe
  roles:     { code: string; label: string }[]
  membres:   (MembreResume & { roles?: string[] })[]
  actuels:   Record<string, string | null>
  filtrerParRole?: boolean
}

/** Bouton « Modifier » qui ouvre la désignation de l'équipe du module. */
export function EditeurEquipe({ culteId, module, roles, membres, actuels, filtrerParRole }: EditeurProps) {
  const router = useRouter()
  const [ouvert, setOuvert]     = useState(false)
  const [valeurs, setValeurs]   = useState(actuels)
  const [prevenir, setPrevenir] = useState(true)
  const [enCours, demarrer]     = useTransition()

  function enregistrer() {
    demarrer(async () => {
      // Envoie aussi les rôles vidés pour retirer une personne
      const complet = Object.fromEntries(roles.map(r => [r.code, valeurs[r.code] ?? null]))
      const res = await designerEquipe(culteId, module, complet, prevenir)
      if (res.error) { toast.error(res.error); return }
      toast.success(res.prevenus ? `Équipe enregistrée, ${res.prevenus} personne(s) prévenue(s)` : 'Équipe enregistrée')
      setOuvert(false)
      router.refresh()
    })
  }

  if (!ouvert) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOuvert(true)}>
        <Pencil className="h-3.5 w-3.5" />Désigner
      </Button>
    )
  }

  return (
    <div className="w-full space-y-4 rounded-xl border bg-muted/40 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
      <ChampsEquipe
        roles={roles}
        membres={membres}
        valeurs={valeurs}
        filtrerParRole={filtrerParRole}
        onChange={(r, v) => setValeurs(s => ({ ...s, [r]: v }))}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={prevenir} onCheckedChange={setPrevenir} />
          Prévenir les nouvelles personnes désignées
        </label>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setValeurs(actuels); setOuvert(false) }}>
            <X className="h-3.5 w-3.5" />Annuler
          </Button>
          <Button size="sm" onClick={enregistrer} disabled={enCours}>
            {enCours ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Relance (notification + e-mail) des personnes désignées. */
export function BoutonRelance({
  culteId, modules, libelle = 'Relancer', variant = 'outline',
}: {
  culteId: string
  modules: ModuleEquipe[]
  libelle?: string
  variant?: 'outline' | 'default'
}) {
  const [enCours, demarrer] = useTransition()
  function relancer() {
    demarrer(async () => {
      const res = await relancerEquipes(culteId, modules)
      if (res.error) { toast.error(res.error); return }
      toast.success(`Rappel envoyé (${res.envoyes ?? 0} e-mail${(res.envoyes ?? 0) > 1 ? 's' : ''})`)
      if (res.sansEmail) toast.warning(`${res.sansEmail} personne(s) sans adresse e-mail : prévenez-les directement.`)
    })
  }
  return (
    <Button variant={variant} size="sm" onClick={relancer} disabled={enCours}>
      {enCours ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
      {libelle}
    </Button>
  )
}

/** Crée les annonces ou la liste des cantiques d'un culte qui n'en a pas encore. */
export function BoutonPreparer({ culteId, quoi, libelle }: {
  culteId: string; quoi: 'annonces' | 'cantiques'; libelle: string
}) {
  const router = useRouter()
  const [enCours, demarrer] = useTransition()
  function preparer() {
    demarrer(async () => {
      const res = await preparerModule(culteId, quoi)
      if (res.error || !res.id) { toast.error(res.error ?? 'Erreur'); return }
      router.push(quoi === 'annonces' ? `/annonces/${res.id}/rubriques` : `/projection/setlists/${res.id}/edit`)
    })
  }
  return (
    <Button size="sm" onClick={preparer} disabled={enCours}>
      {enCours ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
      {libelle}
    </Button>
  )
}
