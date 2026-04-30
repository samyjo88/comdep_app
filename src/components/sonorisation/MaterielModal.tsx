'use client'

import { useEffect, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Wrench } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from '@/components/ui/sheet'
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import { useIsMobile } from '@/hooks/use-media-query'
import { creerMateriel, modifierMateriel } from '@/lib/sonorisation/actions'
import type { MaterielSono } from '@/lib/supabase/types'

// ── Schéma de validation ───────────────────────────────────────────────────

const schema = z
  .object({
    nom:                    z.string().min(1, 'Le nom est obligatoire'),
    categorie:              z.enum(['microphone', 'enceinte', 'mixette', 'cable', 'autre']),
    quantite_total:         z.number().int().min(1, 'Minimum 1'),
    quantite_disponible:    z.number().int().min(0, 'Minimum 0'),
    etat:                   z.enum(['neuf', 'bon', 'use', 'en_panne']),
    dernier_nettoyage:      z.string().optional().nullable(),
    prochain_nettoyage:     z.string().optional().nullable(),
    en_reparation:          z.boolean(),
    description_reparation: z.string().optional().nullable(),
    date_envoi_reparation:  z.string().optional().nullable(),
    valeur_achat:           z.number().min(0).nullable().optional(),
    notes:                  z.string().optional().nullable(),
  })
  .refine(
    d => d.quantite_disponible <= d.quantite_total,
    { message: 'Ne peut pas dépasser la quantité totale', path: ['quantite_disponible'] }
  )
  .refine(
    d => !d.en_reparation || !!d.description_reparation?.trim(),
    { message: 'Décrivez le problème', path: ['description_reparation'] }
  )

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  materiel?: MaterielSono | null
  onSuccess?: () => void
}

const defaultValues: FormValues = {
  nom:                    '',
  categorie:              'autre',
  quantite_total:         1,
  quantite_disponible:    1,
  etat:                   'bon',
  dernier_nettoyage:      null,
  prochain_nettoyage:     null,
  en_reparation:          false,
  description_reparation: null,
  date_envoi_reparation:  null,
  valeur_achat:           null,
  notes:                  null,
}

function toFormValues(m: MaterielSono): FormValues {
  return {
    nom:                    m.nom,
    categorie:              (['microphone','enceinte','mixette','cable'].includes(m.categorie)
                              ? m.categorie : 'autre') as FormValues['categorie'],
    quantite_total:         m.quantite_total,
    quantite_disponible:    m.quantite_disponible,
    etat:                   m.etat,
    dernier_nettoyage:      m.dernier_nettoyage ?? null,
    prochain_nettoyage:     m.prochain_nettoyage ?? null,
    en_reparation:          m.en_reparation,
    description_reparation: m.description_reparation ?? null,
    date_envoi_reparation:  m.date_envoi_reparation ?? null,
    valeur_achat:           m.valeur_achat ?? null,
    notes:                  m.notes ?? null,
  }
}

// ── Contenu du formulaire (partagé Dialog / Sheet) ─────────────────────────

function FormBody({
  form,
  enReparation,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
  enReparation: boolean
}) {
  return (
    <div className="space-y-5">
      <FormField control={form.control} name="nom" render={({ field }) => (
        <FormItem>
          <FormLabel>Nom de l&apos;équipement <span className="text-destructive">*</span></FormLabel>
          <FormControl>
            <Input placeholder="ex : Shure SM58" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="categorie" render={({ field }) => (
          <FormItem>
            <FormLabel>Catégorie <span className="text-destructive">*</span></FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="microphone">🎤 Microphone</SelectItem>
                <SelectItem value="enceinte">🔊 Enceinte</SelectItem>
                <SelectItem value="mixette">🎚️ Console de mixage</SelectItem>
                <SelectItem value="cable">🔗 Câble</SelectItem>
                <SelectItem value="autre">📦 Autre</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="etat" render={({ field }) => (
          <FormItem>
            <FormLabel>État <span className="text-destructive">*</span></FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="neuf">✨ Neuf</SelectItem>
                <SelectItem value="bon">✅ Bon</SelectItem>
                <SelectItem value="use">🟡 Usagé</SelectItem>
                <SelectItem value="en_panne">🔴 En panne</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="quantite_total" render={({ field }) => (
          <FormItem>
            <FormLabel>Quantité totale <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <Input type="number" min={1} {...field}
                onChange={e => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value, 10))} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="quantite_disponible" render={({ field }) => (
          <FormItem>
            <FormLabel>Quantité disponible <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <Input type="number" min={0} {...field}
                onChange={e => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value, 10))} />
            </FormControl>
            <FormDescription>≤ quantité totale</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="dernier_nettoyage" render={({ field }) => (
          <FormItem>
            <FormLabel>Dernier nettoyage</FormLabel>
            <FormControl>
              <Input type="date" {...field} value={field.value ?? ''}
                onChange={e => field.onChange(e.target.value || null)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="prochain_nettoyage" render={({ field }) => (
          <FormItem>
            <FormLabel>Prochain nettoyage</FormLabel>
            <FormControl>
              <Input type="date" {...field} value={field.value ?? ''}
                onChange={e => field.onChange(e.target.value || null)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <FormField control={form.control} name="en_reparation" render={({ field }) => (
        <FormItem className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <FormLabel className="flex items-center gap-2 text-base cursor-pointer">
              <Wrench className="h-4 w-4 text-destructive" />
              En réparation
            </FormLabel>
            <FormDescription>Au moins une unité en réparation</FormDescription>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )} />

      {enReparation && (
        <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
            <Wrench className="h-4 w-4" />
            Détails de la réparation
          </p>
          <FormField control={form.control} name="description_reparation" render={({ field }) => (
            <FormItem>
              <FormLabel>Description du problème <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Textarea placeholder="Décrivez le problème constaté…" rows={3}
                  {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="date_envoi_reparation" render={({ field }) => (
            <FormItem>
              <FormLabel>Date d&apos;envoi en réparation</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value || null)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      )}

      <FormField control={form.control} name="valeur_achat" render={({ field }) => (
        <FormItem>
          <FormLabel>Valeur d&apos;achat (F CFA)</FormLabel>
          <FormControl>
            <Input type="number" min={0} step={500} placeholder="ex : 25000"
              {...field} value={field.value ?? ''}
              onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="notes" render={({ field }) => (
        <FormItem>
          <FormLabel>Notes</FormLabel>
          <FormControl>
            <Textarea placeholder="Informations complémentaires…" rows={2}
              {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      {form.formState.errors.root && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {form.formState.errors.root.message}
        </div>
      )}
    </div>
  )
}

// ── Composant ─────────────────────────────────────────────────────────────

export function MaterielModal({ open, onOpenChange, materiel, onSuccess }: Props) {
  const isEdit = !!materiel
  const isMobile = useIsMobile()
  const [isPending, startTransition] = useTransition()

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues,
  })

  useEffect(() => {
    if (open) form.reset(materiel ? toFormValues(materiel) : defaultValues)
  }, [open, materiel, form])

  const enReparation = form.watch('en_reparation')
  const title = isEdit ? 'Modifier un équipement' : 'Ajouter un équipement'
  const description = isEdit
    ? `Modification de "${materiel?.nom}"`
    : 'Renseignez les informations du nouvel équipement.'

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const payload = {
        nom:                    values.nom,
        categorie:              values.categorie as import('@/lib/supabase/types').CategorieMateriel,
        quantite_total:         values.quantite_total,
        quantite_disponible:    values.quantite_disponible,
        etat:                   values.etat as import('@/lib/supabase/types').EtatMateriel,
        dernier_nettoyage:      values.dernier_nettoyage || null,
        prochain_nettoyage:     values.prochain_nettoyage || null,
        en_reparation:          values.en_reparation,
        description_reparation: values.en_reparation ? (values.description_reparation || null) : null,
        date_envoi_reparation:  values.en_reparation ? (values.date_envoi_reparation || null) : null,
        valeur_achat:           values.valeur_achat ? Number(values.valeur_achat) : null,
        notes:                  values.notes || null,
      }
      const result = isEdit
        ? await modifierMateriel(materiel!.id, payload)
        : await creerMateriel(payload)
      if (!result.success) { form.setError('root', { message: result.error }); return }
      onOpenChange(false)
      onSuccess?.()
    })
  }

  const submitLabel = isEdit ? 'Enregistrer les modifications' : "Ajouter l'équipement"

  // ── Mobile : Sheet depuis le bas ──────────────────────────────────────────
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <Form {...form}>
              <form id="materiel-form" onSubmit={form.handleSubmit(onSubmit)}>
                <FormBody form={form} enReparation={enReparation} />
              </form>
            </Form>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="min-h-[44px]">
              Annuler
            </Button>
            <Button type="submit" form="materiel-form" disabled={isPending} className="min-h-[44px]">
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {submitLabel}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  // ── Desktop : Dialog centré ───────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormBody form={form} enReparation={enReparation} />
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
