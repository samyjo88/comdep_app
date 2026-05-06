'use client'

import { useEffect, useState, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Phone, Mail, Loader2, UserX, UserCheck, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

import { Button }   from '@/components/ui/button'
import { Badge }    from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Switch }   from '@/components/ui/switch'
import { Input }    from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label }    from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet, SheetBody, SheetContent, SheetDescription,
  SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useIsMobile } from '@/hooks/use-media-query'

import type { MembreCM } from '@/types/community'
import { PLATEFORMES_CONFIG, PLATEFORMES_BY_CODE } from '@/types/community'
import type { StatsParMembreCM } from '@/app/community/equipe/page'
import {
  creerMembreCMAction,
  modifierMembreCMAction,
  toggleActifMembreCMAction,
} from '@/app/community/equipe/actions'

// ── Config ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500',   'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500',   'bg-pink-500',   'bg-indigo-500',  'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500',   'bg-lime-600',    'bg-sky-500',
]

const SPECIALITES_CONFIG = [
  { id: 'redaction', label: 'Rédaction', icone: '✍️', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'design',    label: 'Design',    icone: '🎨', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'video',     label: 'Vidéo',     icone: '🎬', className: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'photo',     label: 'Photo',     icone: '📸', className: 'bg-orange-50 text-orange-700 border-orange-200' },
]

function getAvatarColor(name: string): string {
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

function getInitials(prenom: string, nom: string): string {
  return `${(prenom[0] ?? '').toUpperCase()}${(nom[0] ?? '').toUpperCase()}`
}

// ── Schéma Zod ────────────────────────────────────────────────────────────────

const schema = z.object({
  prenom:      z.string().min(1, 'Prénom obligatoire'),
  nom:         z.string().min(1, 'Nom obligatoire'),
  telephone:   z.string().nullable().optional(),
  email:       z.string()
    .refine(v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: 'Email invalide' })
    .nullable().optional(),
  specialites: z.array(z.string()),
  plateformes: z.array(z.string()),
  notes:       z.string().nullable().optional(),
})

type FormValues = z.infer<typeof schema>

const defaultValues: FormValues = {
  prenom: '', nom: '', telephone: null, email: null,
  specialites: [], plateformes: [], notes: null,
}

function toFormValues(m: MembreCM): FormValues {
  return {
    prenom:      m.prenom,
    nom:         m.nom,
    telephone:   m.telephone,
    email:       m.email,
    specialites: m.specialites ?? [],
    plateformes: m.plateformes ?? [],
    notes:       m.notes,
  }
}

// ── Corps du formulaire ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MembreFormBody({ form }: { form: any }) {
  return (
    <div className="space-y-5">
      {/* Prénom / Nom */}
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="prenom" render={({ field }) => (
          <FormItem>
            <FormLabel>Prénom <span className="text-destructive">*</span></FormLabel>
            <FormControl><Input placeholder="Marie" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="nom" render={({ field }) => (
          <FormItem>
            <FormLabel>Nom <span className="text-destructive">*</span></FormLabel>
            <FormControl><Input placeholder="Dupont" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      {/* Spécialités */}
      <Controller
        control={form.control}
        name="specialites"
        render={({ field }) => (
          <div className="space-y-2">
            <Label>Spécialités</Label>
            <div className="grid grid-cols-2 gap-2">
              {SPECIALITES_CONFIG.map(s => {
                const checked = (field.value as string[]).includes(s.id)
                return (
                  <label
                    key={s.id}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors select-none',
                      checked ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-primary shrink-0"
                      checked={checked}
                      onChange={e => {
                        const next = e.target.checked
                          ? [...field.value, s.id]
                          : (field.value as string[]).filter((v: string) => v !== s.id)
                        field.onChange(next)
                      }}
                    />
                    <span className="text-sm font-medium">{s.icone} {s.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}
      />

      {/* Plateformes gérées */}
      <Controller
        control={form.control}
        name="plateformes"
        render={({ field }) => (
          <div className="space-y-2">
            <Label>Plateformes gérées</Label>
            <div className="grid grid-cols-2 gap-2">
              {PLATEFORMES_CONFIG.map(p => {
                const checked = (field.value as string[]).includes(p.code)
                return (
                  <label
                    key={p.code}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors select-none',
                      checked ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50',
                    )}
                    style={checked ? {
                      borderColor: p.couleur + '50',
                      background:  p.couleurBg,
                    } : {}}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input shrink-0"
                      style={{ accentColor: p.couleur }}
                      checked={checked}
                      onChange={e => {
                        const next = e.target.checked
                          ? [...field.value, p.code]
                          : (field.value as string[]).filter((v: string) => v !== p.code)
                        field.onChange(next)
                      }}
                    />
                    <span className="text-sm font-medium">{p.icone} {p.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}
      />

      {/* Téléphone / Email */}
      <FormField control={form.control} name="telephone" render={({ field }) => (
        <FormItem>
          <FormLabel>Téléphone</FormLabel>
          <FormControl>
            <Input type="tel" placeholder="+228 90 00 00 00" {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="email" render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input type="email" placeholder="marie@exemple.com" {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      {/* Notes */}
      <FormField control={form.control} name="notes" render={({ field }) => (
        <FormItem>
          <FormLabel>Notes</FormLabel>
          <FormControl>
            <Textarea
              placeholder="Disponibilités, contraintes, remarques…"
              className="resize-none"
              rows={3}
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
    </div>
  )
}

// ── Modal ajout / modification ────────────────────────────────────────────────

function MembreModal({
  open, onOpenChange, membre,
}: {
  open:         boolean
  onOpenChange: (v: boolean) => void
  membre:       MembreCM | null
}) {
  const isEdit   = !!membre
  const isMobile = useIsMobile()
  const [isPending, startTransition] = useTransition()

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues,
  })

  useEffect(() => {
    if (open) form.reset(membre ? toFormValues(membre) : defaultValues)
  }, [open, membre, form])

  const title       = isEdit ? 'Modifier le membre' : 'Ajouter un membre'
  const description = isEdit
    ? `Modification de ${membre?.prenom} ${membre?.nom}`
    : "Nouveau membre de l'équipe Community Management"

  function onSubmit(values: FormValues) {
    const payload = {
      prenom:      values.prenom,
      nom:         values.nom,
      telephone:   values.telephone  || null,
      email:       values.email      || null,
      specialites: values.specialites,
      plateformes: values.plateformes,
      notes:       values.notes      || null,
    }
    startTransition(async () => {
      const result = isEdit
        ? await modifierMembreCMAction(membre!.id, payload)
        : await creerMembreCMAction(payload)
      if (!result.success) { form.setError('root', { message: result.error }); return }
      onOpenChange(false)
    })
  }

  const submitBtn = (
    <Button onClick={form.handleSubmit(onSubmit)} disabled={isPending} className="min-h-[44px]">
      {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
      {isEdit ? 'Enregistrer' : 'Ajouter'}
    </Button>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <Form {...form}><MembreFormBody form={form} /></Form>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="min-h-[44px]">
              Annuler
            </Button>
            {submitBtn}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <MembreFormBody form={form} />
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isEdit ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Carte membre ──────────────────────────────────────────────────────────────

function MembreCard({
  membre, stats, trimestreLabel, onEdit,
}: {
  membre:          MembreCM
  stats:           StatsParMembreCM[string] | undefined
  trimestreLabel:  string
  onEdit:          () => void
}) {
  const [actifLocal, setActifLocal]   = useState(membre.actif)
  const [isPending, startTransition]  = useTransition()

  useEffect(() => { setActifLocal(membre.actif) }, [membre.actif])

  const avatarColor = getAvatarColor(membre.prenom + membre.nom)
  const initials    = getInitials(membre.prenom, membre.nom)
  const semGerrees  = stats?.semGerrees ?? 0

  function handleToggleActif(newActif: boolean) {
    setActifLocal(newActif)
    startTransition(async () => {
      const res = await toggleActifMembreCMAction(membre.id, newActif)
      if (!res.success) setActifLocal(!newActif)
    })
  }

  return (
    <Card className={cn('flex flex-col transition-all duration-200', !actifLocal && 'opacity-60 bg-muted/20')}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={cn(
            'flex items-center justify-center w-12 h-12 rounded-full shrink-0 select-none',
            'text-white font-bold text-lg',
            avatarColor,
          )}>
            {initials}
          </div>

          {/* Nom + badges */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-tight truncate">{membre.prenom} {membre.nom}</p>

            {/* Spécialités */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(membre.specialites ?? []).map(s => {
                const cfg = SPECIALITES_CONFIG.find(c => c.id === s)
                return cfg ? (
                  <Badge key={s} variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4', cfg.className)}>
                    {cfg.icone} {cfg.label}
                  </Badge>
                ) : null
              })}
              {(membre.specialites ?? []).length === 0 && (
                <span className="text-xs text-muted-foreground/50 italic">Aucune spécialité</span>
              )}
            </div>

            {/* Plateformes */}
            <div className="flex flex-wrap gap-1 mt-1">
              {(membre.plateformes ?? []).map(p => {
                const cfg = PLATEFORMES_BY_CODE[p as keyof typeof PLATEFORMES_BY_CODE]
                return cfg ? (
                  <Badge
                    key={p}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4"
                    style={{ borderColor: cfg.couleur + '50', color: cfg.couleur }}
                  >
                    {cfg.icone} {cfg.label}
                  </Badge>
                ) : null
              })}
            </div>
          </div>

          {/* Toggle actif */}
          <Switch
            checked={actifLocal}
            onCheckedChange={handleToggleActif}
            disabled={isPending}
            title={actifLocal ? 'Désactiver' : 'Activer'}
          />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 flex-1">
        {/* Contact */}
        {membre.telephone ? (
          <a href={`tel:${membre.telephone}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <Phone className="h-3.5 w-3.5 shrink-0 group-hover:text-primary" />
            <span className="truncate">{membre.telephone}</span>
          </a>
        ) : (
          <span className="flex items-center gap-2 text-sm text-muted-foreground/40 italic">
            <Phone className="h-3.5 w-3.5 shrink-0" /> Non renseigné
          </span>
        )}

        {membre.email ? (
          <a href={`mailto:${membre.email}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <Mail className="h-3.5 w-3.5 shrink-0 group-hover:text-primary" />
            <span className="truncate">{membre.email}</span>
          </a>
        ) : (
          <span className="flex items-center gap-2 text-sm text-muted-foreground/40 italic">
            <Mail className="h-3.5 w-3.5 shrink-0" /> Non renseigné
          </span>
        )}

        {/* Stat semaines */}
        <div className="pt-2 mt-1 border-t">
          <span className={cn(
            'text-xs font-medium px-2 py-1 rounded-full',
            semGerrees > 0
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-muted text-muted-foreground',
          )}>
            {semGerrees} semaine{semGerrees !== 1 ? 's' : ''} gérée{semGerrees !== 1 ? 's' : ''} — {trimestreLabel}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 mt-auto border-t">
          <Button
            variant="outline" size="sm"
            className="flex-1 min-h-[40px]"
            onClick={onEdit}
            disabled={isPending}
          >
            Modifier
          </Button>
          <Button
            variant="ghost" size="sm"
            className={cn(
              'flex-1 min-h-[40px] gap-1 text-xs',
              actifLocal
                ? 'text-destructive hover:text-destructive hover:bg-destructive/10'
                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50',
            )}
            onClick={() => handleToggleActif(!actifLocal)}
            disabled={isPending}
          >
            {isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : actifLocal
                ? <><UserX className="h-3.5 w-3.5" />Désactiver</>
                : <><UserCheck className="h-3.5 w-3.5" />Réactiver</>
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Tableau de participation ───────────────────────────────────────────────────

function TableauStats({
  membres, statsParMembre, trimestreLabel,
}: {
  membres:        MembreCM[]
  statsParMembre: StatsParMembreCM
  trimestreLabel: string
}) {
  const actifs = membres.filter(m => m.actif)
  const avecDonnees = actifs.filter(m =>
    (statsParMembre[m.id]?.semGerrees ?? 0) > 0 ||
    (statsParMembre[m.id]?.postsCrees ?? 0) > 0,
  )
  if (avecDonnees.length === 0) return null

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/40 flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Participation — {trimestreLabel}</h2>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20">
              <TableHead className="font-semibold">Membre</TableHead>
              <TableHead className="text-center font-semibold whitespace-nowrap">Sem. gérées</TableHead>
              <TableHead className="text-center font-semibold whitespace-nowrap">Posts créés</TableHead>
              <TableHead className="text-center font-semibold whitespace-nowrap">Posts publiés</TableHead>
              <TableHead className="text-center font-semibold whitespace-nowrap">Taux publication</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {avecDonnees
              .sort((a, b) => (statsParMembre[b.id]?.semGerrees ?? 0) - (statsParMembre[a.id]?.semGerrees ?? 0))
              .map(m => {
                const s    = statsParMembre[m.id] ?? { semGerrees: 0, postsCrees: 0, postsPublies: 0 }
                const taux = s.postsCrees > 0
                  ? Math.round((s.postsPublies / s.postsCrees) * 100)
                  : null

                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
                          getAvatarColor(m.prenom + m.nom),
                        )}>
                          {getInitials(m.prenom, m.nom)}
                        </div>
                        <span className="whitespace-nowrap">{m.prenom} {m.nom}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {s.semGerrees > 0 ? (
                        <span className="font-semibold text-primary">{s.semGerrees}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {s.postsCrees > 0 ? (
                        <span className="font-semibold">{s.postsCrees}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {s.postsPublies > 0 ? (
                        <span className="font-semibold text-green-700">{s.postsPublies}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {taux !== null ? (
                        <span className={cn(
                          'text-sm font-semibold tabular-nums',
                          taux >= 80 ? 'text-green-700' : taux >= 50 ? 'text-amber-600' : 'text-red-600',
                        )}>
                          {taux}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

type Filtre = 'tous' | 'inactifs' | string

export function EquipeCMClient({
  membres, statsParMembre, trimestreLabel,
}: {
  membres:        MembreCM[]
  statsParMembre: StatsParMembreCM
  trimestreLabel: string
}) {
  const [filtre, setFiltre]                   = useState<Filtre>('tous')
  const [modalOpen, setModalOpen]             = useState(false)
  const [membreEnEdition, setMembreEnEdition] = useState<MembreCM | null>(null)

  // ── Filtrage ──────────────────────────────────────────────────────────────

  const membresFiltres = membres.filter(m => {
    if (filtre === 'inactifs')          return !m.actif
    if (!m.actif)                       return false
    if (filtre === 'tous')              return true
    if (filtre.startsWith('spec:'))     return (m.specialites ?? []).includes(filtre.slice(5))
    if (filtre.startsWith('plate:'))    return (m.plateformes ?? []).includes(filtre.slice(6))
    return true
  })

  function count(f: Filtre): number {
    if (f === 'inactifs')        return membres.filter(m => !m.actif).length
    if (f === 'tous')            return membres.filter(m => m.actif).length
    if (f.startsWith('spec:'))   return membres.filter(m => m.actif && (m.specialites ?? []).includes(f.slice(5))).length
    if (f.startsWith('plate:'))  return membres.filter(m => m.actif && (m.plateformes ?? []).includes(f.slice(6))).length
    return 0
  }

  // Plateformes qui ont au moins un membre actif
  const platesActives = PLATEFORMES_CONFIG.filter(p =>
    membres.some(m => m.actif && (m.plateformes ?? []).includes(p.code)),
  )

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openAdd()  { setMembreEnEdition(null); setModalOpen(true) }
  function openEdit(m: MembreCM) { setMembreEnEdition(m); setModalOpen(true) }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  const FiltreBtn = ({ value, label }: { value: Filtre; label: string }) => (
    <button
      onClick={() => setFiltre(value)}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap min-h-[36px]',
        filtre === value
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      <span className={cn(
        'text-xs px-1.5 py-0.5 rounded-full tabular-nums',
        filtre === value ? 'bg-muted text-muted-foreground' : 'bg-muted/60 text-muted-foreground/60',
      )}>
        {count(value)}
      </span>
    </button>
  )

  return (
    <div className="space-y-6">

      {/* ── Filtres + bouton ajout ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5 flex-1 min-w-0">
          {/* Ligne 1 : Tous + spécialités + inactifs */}
          <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto scrollbar-none">
            <FiltreBtn value="tous"     label="Tous" />
            {SPECIALITES_CONFIG.map(s => (
              <FiltreBtn key={s.id} value={`spec:${s.id}`} label={`${s.icone} ${s.label}`} />
            ))}
            <FiltreBtn value="inactifs" label="Inactifs" />
          </div>

          {/* Ligne 2 : Plateformes (masquée si aucune) */}
          {platesActives.length > 0 && (
            <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1 overflow-x-auto scrollbar-none">
              <span className="px-2 py-1 text-[11px] font-medium text-muted-foreground shrink-0">
                Plateforme :
              </span>
              {platesActives.map(p => (
                <FiltreBtn key={p.code} value={`plate:${p.code}`} label={`${p.icone} ${p.label}`} />
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={openAdd}
          size="sm"
          className="gap-1.5 shrink-0 self-start min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          Ajouter un membre
        </Button>
      </div>

      {/* ── Grille de cartes ──────────────────────────────────────────────── */}
      {membresFiltres.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-xl border border-dashed text-center">
          <Users className="h-10 w-10 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">
            {filtre === 'inactifs' ? 'Aucun membre inactif' : 'Aucun membre pour ce filtre'}
          </p>
          {filtre === 'tous' && (
            <Button variant="outline" size="sm" onClick={openAdd} className="gap-1.5 min-h-[44px]">
              <Plus className="h-4 w-4" />
              Ajouter le premier membre
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {membresFiltres.map(m => (
            <MembreCard
              key={m.id}
              membre={m}
              stats={statsParMembre[m.id]}
              trimestreLabel={trimestreLabel}
              onEdit={() => openEdit(m)}
            />
          ))}
        </div>
      )}

      {/* ── Tableau participation ──────────────────────────────────────── */}
      <TableauStats
        membres={membres}
        statsParMembre={statsParMembre}
        trimestreLabel={trimestreLabel}
      />

      <MembreModal open={modalOpen} onOpenChange={setModalOpen} membre={membreEnEdition} />
    </div>
  )
}
