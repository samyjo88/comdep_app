'use client'

import { useEffect, useState, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Phone, Mail, Loader2, UserX, UserCheck, Users, Camera, ImageIcon, Palette } from 'lucide-react'
import { cn } from '@/lib/utils'

import { Button }           from '@/components/ui/button'
import { Badge }            from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Switch }           from '@/components/ui/switch'
import { Input }            from '@/components/ui/input'
import { Textarea }         from '@/components/ui/textarea'
import { Label }            from '@/components/ui/label'
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

import { ROLES_CONFIG } from '@/types/captation'
import type { MembreCaptation, RoleCaptation } from '@/types/captation'
import type { StatsParMembre } from '@/app/captation/equipe/page'
import {
  creerMembreCaptationAction,
  modifierMembreCaptationAction,
  toggleActifMembreCaptationAction,
} from '@/app/captation/equipe/actions'

// ── Config ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500',   'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500',   'bg-pink-500',   'bg-indigo-500',  'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500',   'bg-lime-600',    'bg-sky-500',
]

const ROLE_BADGE_CONFIG: Record<RoleCaptation, { label: string; className: string; icone: string }> = {
  cameraman:     { label: 'Caméraman',    className: 'bg-blue-50 text-blue-700 border-blue-200',     icone: '🎥' },
  photographe:   { label: 'Photographe',  className: 'bg-purple-50 text-purple-700 border-purple-200', icone: '📷' },
  infographiste: { label: 'Infographiste',className: 'bg-orange-50 text-orange-700 border-orange-200', icone: '🎨' },
}

const ROLE_ICON: Record<RoleCaptation, typeof Camera> = {
  cameraman:     Camera,
  photographe:   ImageIcon,
  infographiste: Palette,
}

function getAvatarColor(name: string): string {
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

function getInitials(prenom: string, nom: string): string {
  return `${(prenom[0] ?? '').toUpperCase()}${(nom[0] ?? '').toUpperCase()}`
}

// ── Schéma zod ─────────────────────────────────────────────────────────────

const ROLES_VALIDES = ['cameraman', 'photographe', 'infographiste'] as const

const schema = z.object({
  prenom:    z.string().min(1, 'Prénom obligatoire'),
  nom:       z.string().min(1, 'Nom obligatoire'),
  telephone: z.string().nullable().optional(),
  email:     z.string()
    .refine(v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: 'Email invalide' })
    .nullable().optional(),
  notes:     z.string().nullable().optional(),
  roles:     z.array(z.enum(ROLES_VALIDES)).min(1, 'Sélectionnez au moins un rôle'),
})

type FormValues = z.infer<typeof schema>

const defaultValues: FormValues = {
  prenom: '', nom: '', telephone: null, email: null, notes: null, roles: [],
}

function toFormValues(m: MembreCaptation): FormValues {
  return {
    prenom:    m.prenom,
    nom:       m.nom,
    telephone: m.telephone,
    email:     m.email,
    notes:     m.notes,
    roles:     m.roles as RoleCaptation[],
  }
}

// ── Contenu formulaire partagé ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MembreFormBody({ form }: { form: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="prenom" render={({ field }) => (
          <FormItem>
            <FormLabel>Prénom <span className="text-destructive">*</span></FormLabel>
            <FormControl><Input placeholder="Jean" {...field} /></FormControl>
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

      {/* Multi-select rôles */}
      <Controller
        control={form.control}
        name="roles"
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label>
              Rôles <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-col gap-2">
              {ROLES_CONFIG.map(role => {
                const RoleIcon = ROLE_ICON[role.code]
                const checked  = (field.value as RoleCaptation[]).includes(role.code)
                return (
                  <label
                    key={role.code}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors select-none',
                      checked
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-primary"
                      checked={checked}
                      onChange={e => {
                        const next = e.target.checked
                          ? [...field.value, role.code]
                          : field.value.filter((r: RoleCaptation) => r !== role.code)
                        field.onChange(next)
                      }}
                    />
                    <RoleIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{role.icone} {role.label}</span>
                  </label>
                )
              })}
            </div>
            {fieldState.error && (
              <p className="text-xs text-destructive">{fieldState.error.message}</p>
            )}
          </div>
        )}
      />

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
            <Input type="email" placeholder="jean@exemple.com" {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="notes" render={({ field }) => (
        <FormItem>
          <FormLabel>Notes</FormLabel>
          <FormControl>
            <Textarea
              placeholder="Informations complémentaires…"
              {...field}
              value={field.value ?? ''}
              className="resize-none"
              rows={3}
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

// ── Modal add/edit ─────────────────────────────────────────────────────────

function MembreModal({
  open, onOpenChange, membre,
}: {
  open:          boolean
  onOpenChange:  (v: boolean) => void
  membre:        MembreCaptation | null
}) {
  const isEdit    = !!membre
  const isMobile  = useIsMobile()
  const [isPending, startTransition] = useTransition()

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues,
  })

  useEffect(() => {
    if (open) form.reset(membre ? toFormValues(membre) : defaultValues)
  }, [open, membre, form])

  const title = isEdit ? 'Modifier le membre' : 'Ajouter un membre'
  const description = isEdit
    ? `Modification de ${membre?.prenom} ${membre?.nom}`
    : "Nouveau membre de l'équipe captation"

  function onSubmit(values: FormValues) {
    const payload = {
      prenom:    values.prenom,
      nom:       values.nom,
      telephone: values.telephone || null,
      email:     values.email     || null,
      notes:     values.notes     || null,
      roles:     values.roles as RoleCaptation[],
    }
    startTransition(async () => {
      const result = isEdit
        ? await modifierMembreCaptationAction(membre!.id, payload)
        : await creerMembreCaptationAction(payload)
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
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

// ── Carte membre ───────────────────────────────────────────────────────────

function MembreCard({
  membre, stats, trimestreLabel, onEdit,
}: {
  membre:          MembreCaptation
  stats:           StatsParMembre[string] | undefined
  trimestreLabel:  string
  onEdit:          () => void
}) {
  const [actifLocal, setActifLocal]   = useState(membre.actif)
  const [isPending, startTransition]  = useTransition()

  useEffect(() => { setActifLocal(membre.actif) }, [membre.actif])

  const avatarColor = getAvatarColor(membre.prenom + membre.nom)
  const initials    = getInitials(membre.prenom, membre.nom)
  const nbCultes    = stats?.total ?? 0

  function handleToggleActif(newActif: boolean) {
    setActifLocal(newActif)
    startTransition(async () => {
      const res = await toggleActifMembreCaptationAction(membre.id, newActif)
      if (!res.success) setActifLocal(!newActif)
    })
  }

  return (
    <Card className={cn('flex flex-col transition-all duration-200', !actifLocal && 'opacity-60 bg-muted/20')}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={cn(
            'flex items-center justify-center w-12 h-12 rounded-full shrink-0',
            'text-white font-bold text-lg select-none',
            avatarColor,
          )}>
            {initials}
          </div>

          {/* Nom + rôles */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-tight truncate">{membre.prenom} {membre.nom}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {membre.roles.map(role => {
                const cfg = ROLE_BADGE_CONFIG[role]
                return (
                  <Badge key={role} variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 gap-0.5', cfg.className)}>
                    {cfg.icone} {cfg.label}
                  </Badge>
                )
              })}
              {membre.roles.length === 0 && (
                <span className="text-xs text-muted-foreground/50 italic">Aucun rôle</span>
              )}
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
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
            <Phone className="h-3.5 w-3.5 shrink-0 group-hover:text-primary" />
            <span className="truncate">{membre.telephone}</span>
          </a>
        ) : (
          <span className="flex items-center gap-2 text-sm text-muted-foreground/40 italic">
            <Phone className="h-3.5 w-3.5 shrink-0" />Non renseigné
          </span>
        )}

        {membre.email ? (
          <a href={`mailto:${membre.email}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
            <Mail className="h-3.5 w-3.5 shrink-0 group-hover:text-primary" />
            <span className="truncate">{membre.email}</span>
          </a>
        ) : (
          <span className="flex items-center gap-2 text-sm text-muted-foreground/40 italic">
            <Mail className="h-3.5 w-3.5 shrink-0" />Non renseigné
          </span>
        )}

        {/* Stat trimestre */}
        <div className="flex items-center gap-2 text-sm mt-1 pt-2 border-t">
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            nbCultes > 0
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-muted text-muted-foreground',
          )}>
            {nbCultes} culte{nbCultes !== 1 ? 's' : ''} — {trimestreLabel}
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

// ── Tableau stats ──────────────────────────────────────────────────────────

function TableauStatsTrimestrielle({
  membres, statsParMembre, trimestreLabel,
}: {
  membres:         MembreCaptation[]
  statsParMembre:  StatsParMembre
  trimestreLabel:  string
}) {
  const actifs = membres.filter(m => m.actif)
  const total  = actifs.reduce((acc, m) => acc + (statsParMembre[m.id]?.total ?? 0), 0)
  if (total === 0) return null

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
              <TableHead className="text-center font-semibold">🎥 Caméraman</TableHead>
              <TableHead className="text-center font-semibold">📷 Photographe</TableHead>
              <TableHead className="text-center font-semibold">🎨 Infographiste</TableHead>
              <TableHead className="text-center font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actifs
              .filter(m => (statsParMembre[m.id]?.total ?? 0) > 0)
              .sort((a, b) => (statsParMembre[b.id]?.total ?? 0) - (statsParMembre[a.id]?.total ?? 0))
              .map(m => {
                const s = statsParMembre[m.id] ?? { cameraman: 0, photographe: 0, infographiste: 0, total: 0 }
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
                        {m.prenom} {m.nom}
                      </div>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {s.cameraman > 0 ? (
                        <span className="font-semibold text-blue-700">{s.cameraman}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {s.photographe > 0 ? (
                        <span className="font-semibold text-purple-700">{s.photographe}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {s.infographiste > 0 ? (
                        <span className="font-semibold text-orange-700">{s.infographiste}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      <Badge variant="outline" className="text-xs font-semibold">
                        {s.total}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            }
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────

type Filtre = 'tous' | RoleCaptation | 'inactifs'

const FILTRES: { value: Filtre; label: string }[] = [
  { value: 'tous',          label: 'Tous' },
  { value: 'cameraman',     label: '🎥 Caméraman' },
  { value: 'photographe',   label: '📷 Photographe' },
  { value: 'infographiste', label: '🎨 Infographiste' },
  { value: 'inactifs',      label: 'Inactifs' },
]

export function EquipeCaptationClient({
  membres, statsParMembre, trimestreLabel,
}: {
  membres:         MembreCaptation[]
  statsParMembre:  StatsParMembre
  trimestreLabel:  string
}) {
  const [filtre, setFiltre]                   = useState<Filtre>('tous')
  const [modalOpen, setModalOpen]             = useState(false)
  const [membreEnEdition, setMembreEnEdition] = useState<MembreCaptation | null>(null)

  const membresFiltres = membres.filter(m => {
    if (filtre === 'inactifs') return !m.actif
    if (filtre === 'tous')     return m.actif
    return m.actif && m.roles.includes(filtre as RoleCaptation)
  })

  function countFiltre(f: Filtre): number {
    if (f === 'inactifs') return membres.filter(m => !m.actif).length
    if (f === 'tous')     return membres.filter(m => m.actif).length
    return membres.filter(m => m.actif && m.roles.includes(f as RoleCaptation)).length
  }

  function openAdd()  { setMembreEnEdition(null);  setModalOpen(true) }
  function openEdit(m: MembreCaptation) { setMembreEnEdition(m); setModalOpen(true) }

  return (
    <div className="space-y-6">

      {/* Filtres + bouton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 bg-muted rounded-lg p-1 self-start overflow-x-auto max-w-full">
          {FILTRES.map(f => (
            <button
              key={f.value}
              onClick={() => setFiltre(f.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap min-h-[36px]',
                filtre === f.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full tabular-nums',
                filtre === f.value ? 'bg-muted text-muted-foreground' : 'bg-muted/60 text-muted-foreground/60',
              )}>
                {countFiltre(f.value)}
              </span>
            </button>
          ))}
        </div>

        <Button onClick={openAdd} size="sm" className="gap-1.5 self-start sm:self-auto min-h-[44px]">
          <Plus className="h-4 w-4" />
          Ajouter un membre
        </Button>
      </div>

      {/* Grille */}
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

      {/* Tableau de participation */}
      <TableauStatsTrimestrielle
        membres={membres}
        statsParMembre={statsParMembre}
        trimestreLabel={trimestreLabel}
      />

      <MembreModal open={modalOpen} onOpenChange={setModalOpen} membre={membreEnEdition} />
    </div>
  )
}
