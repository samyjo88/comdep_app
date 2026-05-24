'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Phone, Mail, Loader2, UserX, UserCheck, Users, Search, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

import { Button }       from '@/components/ui/button'
import { Badge }        from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Switch }       from '@/components/ui/switch'
import { Input }        from '@/components/ui/input'
import { Textarea }     from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from '@/components/ui/sheet'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'

import { useIsMobile } from '@/hooks/use-media-query'
import {
  creerMembreAnnonceAction,
  modifierMembreAnnonceAction,
  toggleActifMembreAnnonceAction,
  supprimerMembreAnnonceAction,
} from '@/app/annonces/equipe/actions'
import type { MembreAnnonce, RoleAnnonce } from '@/lib/supabase/types'

// ── Config ─────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<RoleAnnonce, { label: string; className: string; icone: string }> = {
  responsable: { label: 'Responsable', icone: '👑', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  redacteur:   { label: 'Rédacteur',   icone: '✍️', className: 'bg-violet-100 text-violet-800 border-violet-200' },
  lecteur:     { label: 'Lecteur',     icone: '🎙️', className: 'bg-amber-100 text-amber-800 border-amber-200' },
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500',   'bg-pink-500', 'bg-indigo-500',  'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500', 'bg-lime-600',    'bg-sky-500',
]

function getAvatarColor(name: string): string {
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

function getInitials(prenom: string, nom: string): string {
  return `${(prenom[0] ?? '').toUpperCase()}${(nom[0] ?? '').toUpperCase()}`
}

// ── Schéma ─────────────────────────────────────────────────────────────────

const schema = z.object({
  prenom:    z.string().min(1, 'Prénom obligatoire'),
  nom:       z.string().min(1, 'Nom obligatoire'),
  telephone: z.string().nullable().optional(),
  email:     z.string()
    .refine(v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: 'Email invalide' })
    .nullable().optional(),
  role:      z.enum(['responsable', 'redacteur', 'lecteur']),
  notes:     z.string().nullable().optional(),
})

type FormValues = z.infer<typeof schema>

const defaultValues: FormValues = {
  prenom: '', nom: '', telephone: null, email: null, role: 'redacteur', notes: null,
}

function toFormValues(m: MembreAnnonce): FormValues {
  return { prenom: m.prenom, nom: m.nom, telephone: m.telephone, email: m.email, role: m.role, notes: m.notes }
}

// ── Contenu formulaire ─────────────────────────────────────────────────────

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

      <FormField control={form.control} name="role" render={({ field }) => (
        <FormItem>
          <FormLabel>Rôle <span className="text-destructive">*</span></FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="responsable">👑 Responsable</SelectItem>
              <SelectItem value="redacteur">✍️ Rédacteur</SelectItem>
              <SelectItem value="lecteur">🎙️ Lecteur</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />

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
  open: boolean
  onOpenChange: (v: boolean) => void
  membre: MembreAnnonce | null
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

  const title = isEdit ? 'Modifier le membre' : 'Ajouter un membre'
  const description = isEdit
    ? `Modification de ${membre?.prenom} ${membre?.nom}`
    : "Nouveau membre de l'équipe annonces"

  function onSubmit(values: FormValues) {
    const payload = {
      prenom:    values.prenom,
      nom:       values.nom,
      telephone: values.telephone || null,
      email:     values.email     || null,
      role:      values.role as RoleAnnonce,
      notes:     values.notes     || null,
    }
    startTransition(async () => {
      const result = isEdit
        ? await modifierMembreAnnonceAction(membre!.id, payload)
        : await creerMembreAnnonceAction(payload)
      if (!result.success) { form.setError('root', { message: result.error }); return }
      toast.success(isEdit ? 'Membre mis à jour' : 'Membre ajouté')
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

// ── Carte membre ───────────────────────────────────────────────────────────

function MembreCard({
  membre, onEdit, isAdmin, onDeleted,
}: {
  membre: MembreAnnonce
  onEdit: () => void
  isAdmin: boolean
  onDeleted: (id: number) => void
}) {
  const [actifLocal, setActifLocal] = useState(membre.actif)
  const [isPending, startTransition] = useTransition()

  useEffect(() => { setActifLocal(membre.actif) }, [membre.actif])

  const roleCfg     = ROLE_CONFIG[membre.role]
  const avatarColor = getAvatarColor(membre.prenom + membre.nom)
  const initials    = getInitials(membre.prenom, membre.nom)

  function handleToggleActif(newActif: boolean) {
    setActifLocal(newActif)
    startTransition(async () => {
      const res = await toggleActifMembreAnnonceAction(membre.id, newActif)
      if (!res.success) setActifLocal(!newActif)
    })
  }

  function handleSupprimer() {
    if (!confirm(`Supprimer définitivement ${membre.prenom} ${membre.nom} ? Cette action est irréversible.`)) return
    startTransition(async () => {
      const res = await supprimerMembreAnnonceAction(membre.id)
      if (!res.success) { toast.error(res.error); return }
      toast.success('Membre supprimé')
      onDeleted(membre.id)
    })
  }

  return (
    <Card className={cn('flex flex-col transition-all duration-200', !actifLocal && 'opacity-60 bg-muted/20')}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex items-center justify-center w-12 h-12 rounded-full shrink-0',
            'text-white font-bold text-lg select-none',
            avatarColor,
          )}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-tight truncate">{membre.prenom} {membre.nom}</p>
            <div className="mt-1.5">
              <Badge variant="outline" className={cn('text-xs font-medium gap-1', roleCfg.className)}>
                {roleCfg.icone} {roleCfg.label}
              </Badge>
            </div>
          </div>
          {isAdmin && (
            <Switch
              checked={actifLocal}
              onCheckedChange={handleToggleActif}
              disabled={isPending}
              title={actifLocal ? 'Désactiver' : 'Activer'}
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 flex-1">
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

        <div className="flex gap-2 pt-3 mt-auto border-t">
          <Button variant="outline" size="sm" className="flex-1 min-h-[44px]" onClick={onEdit} disabled={isPending}>
            Modifier
          </Button>
          {isAdmin && (
            <Button
              variant="ghost" size="sm"
              className={cn(
                'flex-1 min-h-[44px] gap-1 text-xs',
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
          )}
          {isAdmin && (
            <Button
              variant="ghost" size="sm"
              className="min-h-[44px] px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleSupprimer}
              disabled={isPending}
              title="Supprimer ce membre"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Composant principal ────────────────────────────────────────────────────

type Filtre = 'tous' | 'actifs' | RoleAnnonce | 'inactifs'

const FILTRES: { value: Filtre; label: string }[] = [
  { value: 'actifs',       label: 'Actifs' },
  { value: 'responsable',  label: '👑 Responsables' },
  { value: 'redacteur',    label: '✍️ Rédacteurs' },
  { value: 'lecteur',      label: '🎙️ Lecteurs' },
  { value: 'inactifs',     label: 'Inactifs' },
]

export function EquipeAnnoncesClient({ membres: initialMembres, isAdmin }: { membres: MembreAnnonce[]; isAdmin: boolean }) {
  const [membres, setMembres]                 = useState<MembreAnnonce[]>(initialMembres)
  const [filtre, setFiltre]                   = useState<Filtre>('actifs')
  const [search, setSearch]                   = useState('')
  const [sort, setSort]                       = useState<'nom-az' | 'nom-za' | 'role'>('nom-az')
  const [modalOpen, setModalOpen]             = useState(false)
  const [membreEnEdition, setMembreEnEdition] = useState<MembreAnnonce | null>(null)

  function handleDeleted(id: number) {
    setMembres(prev => prev.filter(m => m.id !== id))
  }

  const membresFiltres = membres
    .filter(m => {
      if (filtre === 'inactifs')   return !m.actif
      if (filtre === 'actifs')     return m.actif
      if (filtre === 'tous')       return true
      return m.actif && m.role === filtre
    })
    .filter(m => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return `${m.prenom} ${m.nom}`.toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sort === 'nom-za') return `${b.nom} ${b.prenom}`.localeCompare(`${a.nom} ${a.prenom}`, 'fr')
      if (sort === 'role')   return a.role.localeCompare(b.role, 'fr')
      return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr')
    })

  function countFiltre(f: Filtre): number {
    if (f === 'inactifs') return membres.filter(m => !m.actif).length
    if (f === 'actifs')   return membres.filter(m => m.actif).length
    if (f === 'tous')     return membres.length
    return membres.filter(m => m.actif && m.role === f).length
  }

  function openAdd()  { setMembreEnEdition(null); setModalOpen(true) }
  function openEdit(m: MembreAnnonce) { setMembreEnEdition(m); setModalOpen(true) }

  const stats = {
    actifs:       membres.filter(m => m.actif).length,
    responsables: membres.filter(m => m.actif && m.role === 'responsable').length,
    redacteurs:   membres.filter(m => m.actif && m.role === 'redacteur').length,
    lecteurs:     membres.filter(m => m.actif && m.role === 'lecteur').length,
  }

  return (
    <div className="space-y-6">
      {/* Recherche + tri */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher un membre…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={sort} onValueChange={v => setSort(v as typeof sort)}>
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nom-az">Nom A → Z</SelectItem>
              <SelectItem value="nom-za">Nom Z → A</SelectItem>
              <SelectItem value="role">Par rôle</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
      </div>

      {/* Grille */}
      {membresFiltres.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-xl border border-dashed text-center">
          <Users className="h-10 w-10 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">
            {filtre === 'inactifs' ? 'Aucun membre inactif' : 'Aucun membre pour ce filtre'}
          </p>
          {(filtre === 'actifs' || filtre === 'tous') && (
            <Button variant="outline" size="sm" onClick={openAdd} className="gap-1.5 min-h-[44px]">
              <Plus className="h-4 w-4" />
              Ajouter le premier membre
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {membresFiltres.map(m => (
            <MembreCard key={m.id} membre={m} onEdit={() => openEdit(m)} isAdmin={isAdmin} onDeleted={handleDeleted} />
          ))}
        </div>
      )}

      {/* Résumé */}
      {membres.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-4 border-t text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{stats.actifs}</span> membre{stats.actifs !== 1 ? 's' : ''} actif{stats.actifs !== 1 ? 's' : ''}</span>
          {stats.responsables > 0 && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span><span className="font-semibold text-foreground">{stats.responsables}</span> responsable{stats.responsables !== 1 ? 's' : ''}</span>
            </>
          )}
          {stats.redacteurs > 0 && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span><span className="font-semibold text-foreground">{stats.redacteurs}</span> rédacteur{stats.redacteurs !== 1 ? 's' : ''}</span>
            </>
          )}
          {stats.lecteurs > 0 && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span><span className="font-semibold text-foreground">{stats.lecteurs}</span> lecteur{stats.lecteurs !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
      )}

      <MembreModal open={modalOpen} onOpenChange={setModalOpen} membre={membreEnEdition} />
    </div>
  )
}
