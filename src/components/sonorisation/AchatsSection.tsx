'use client'

import { useEffect, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Loader2, ShoppingCart } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import { creerAchat, modifierStatutAchat, supprimerAchat } from '@/lib/sonorisation/achats-actions'
import type { AchatPlanifie, PrioriteAchat, StatutAchat } from '@/lib/supabase/types'

// ── Config badges ──────────────────────────────────────────────────────────

const PRIORITE_CONFIG: Record<PrioriteAchat, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800 border-red-200' },
  normal: { label: 'Normal', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  faible: { label: 'Faible', className: 'bg-green-100 text-green-800 border-green-200' },
}

const STATUT_CONFIG: Record<StatutAchat, { label: string; className: string }> = {
  en_attente: { label: 'En attente', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  approuve:   { label: 'Approuvé',   className: 'bg-blue-100 text-blue-800 border-blue-200' },
  commande:   { label: 'Commandé',   className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  recu:       { label: 'Reçu',       className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
}

function formatBudget(val: number | null): string {
  if (val == null) return '—'
  return new Intl.NumberFormat('fr-FR').format(val) + ' FCFA'
}

// ── Schéma modal ───────────────────────────────────────────────────────────

const schema = z.object({
  nom:           z.string().min(1, 'Le nom est obligatoire'),
  quantite:      z.number().int().min(1, 'Minimum 1'),
  budget_estime: z.number().min(0).nullable().optional(),
  priorite:      z.enum(['urgent', 'normal', 'faible']),
  notes:         z.string().optional().nullable(),
})

type FormValues = z.infer<typeof schema>

const defaultValues: FormValues = {
  nom:           '',
  quantite:      1,
  budget_estime: null,
  priorite:      'normal',
  notes:         null,
}

// ── Modal nouvel achat ─────────────────────────────────────────────────────

function NouvelAchatModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues,
  })

  useEffect(() => {
    if (open) form.reset(defaultValues)
  }, [open, form])

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await creerAchat({
        nom:           values.nom,
        quantite:      values.quantite,
        budget_estime: values.budget_estime ?? null,
        priorite:      values.priorite as PrioriteAchat,
        notes:         values.notes ?? null,
      })

      if (!result.success) {
        form.setError('root', { message: result.error })
        return
      }

      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvel achat planifié</DialogTitle>
          <DialogDescription>
            Ajoutez un équipement à la liste des achats prévus.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField control={form.control} name="nom" render={({ field }) => (
              <FormItem>
                <FormLabel>Nom du matériel <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="ex : Microphone Shure SM58" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="quantite" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantité <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      type="number" min={1} {...field}
                      onChange={e => field.onChange(e.target.value === '' ? 1 : parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="priorite" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorité <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="urgent">🔴 Urgent</SelectItem>
                      <SelectItem value="normal">🟠 Normal</SelectItem>
                      <SelectItem value="faible">🟢 Faible</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="budget_estime" render={({ field }) => (
              <FormItem>
                <FormLabel>Budget estimé (FCFA)</FormLabel>
                <FormControl>
                  <Input
                    type="number" min={0} step={500} placeholder="ex : 45 000"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Justification, lien produit, fournisseur…"
                    rows={2}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {form.formState.errors.root && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button" variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Ajouter
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Carte achat ────────────────────────────────────────────────────────────

function AchatCard({ achat }: { achat: AchatPlanifie }) {
  const [statutLocal, setStatutLocal] = useState<StatutAchat>(achat.statut)
  const [isPending, startTransition] = useTransition()

  useEffect(() => { setStatutLocal(achat.statut) }, [achat.statut])

  const prioriteCfg = PRIORITE_CONFIG[achat.priorite]
  const statutCfg   = STATUT_CONFIG[statutLocal]

  function handleStatutChange(newStatut: string) {
    const s = newStatut as StatutAchat
    setStatutLocal(s)
    startTransition(async () => {
      await modifierStatutAchat(achat.id, s)
    })
  }

  function handleDelete() {
    if (!confirm(`Supprimer "${achat.nom}" de la liste des achats ?`)) return
    startTransition(async () => { await supprimerAchat(achat.id) })
  }

  return (
    <Card className={`flex flex-col transition-opacity ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-base leading-snug">{achat.nom}</p>
          <Badge
            variant="outline"
            className={`text-xs font-medium shrink-0 ${prioriteCfg.className}`}
          >
            {prioriteCfg.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2.5 flex-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Quantité souhaitée</span>
          <span className="font-medium">{achat.quantite}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Budget estimé</span>
          <span className="font-medium tabular-nums">{formatBudget(achat.budget_estime)}</span>
        </div>

        {achat.notes && (
          <p className="text-xs text-muted-foreground border-t pt-2.5 line-clamp-2 italic">
            {achat.notes}
          </p>
        )}

        {/* Statut + actions */}
        <div className="flex items-center gap-2 border-t pt-3 mt-auto">
          <Badge
            variant="outline"
            className={`text-xs font-medium shrink-0 ${statutCfg.className}`}
          >
            {statutCfg.label}
          </Badge>

          <div className="flex-1 min-w-0">
            <Select onValueChange={handleStatutChange} value={statutLocal} disabled={isPending}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="approuve">Approuvé</SelectItem>
                <SelectItem value="commande">Commandé</SelectItem>
                <SelectItem value="recu">Reçu ✓</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={isPending}
            title="Supprimer cet achat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Section principale ─────────────────────────────────────────────────────

export function AchatsSection({ achats }: { achats: AchatPlanifie[] }) {
  const [modalOpen, setModalOpen] = useState(false)

  const counts = {
    urgent:     achats.filter(a => a.priorite === 'urgent' && a.statut !== 'recu').length,
    en_attente: achats.filter(a => a.statut === 'en_attente').length,
  }

  return (
    <section className="space-y-5">
      {/* En-tête section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Achats planifiés</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {achats.length} achat{achats.length !== 1 ? 's' : ''} planifié{achats.length !== 1 ? 's' : ''}
            {counts.urgent > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                · {counts.urgent} urgent{counts.urgent > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nouvel achat
        </Button>
      </div>

      {/* Grille de cartes */}
      {achats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border border-dashed text-center">
          <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">Aucun achat planifié</p>
          <p className="text-sm text-muted-foreground/60">
            Cliquez sur &quot;+ Nouvel achat&quot; pour en ajouter un.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achats.map(achat => (
            <AchatCard key={achat.id} achat={achat} />
          ))}
        </div>
      )}

      <NouvelAchatModal open={modalOpen} onOpenChange={setModalOpen} />
    </section>
  )
}
