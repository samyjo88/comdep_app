'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus, Pencil, Phone, Mail, Check, Loader2, AlertCircle,
  Monitor, Keyboard, Users, Trash2,
} from 'lucide-react'
import { createMembreAction, updateMembreAction, toggleActifAction, supprimerMembreProjectionAction } from './actions'
import { toast } from 'sonner'

// ── Types ────────────────────────────────────────────────────────────────────

export type Membre = {
  id:         string
  nom:        string
  prenom:     string
  telephone:  string | null
  email:      string | null
  roles:      string[]
  actif:      boolean
  notes:      string | null
  created_at: string
}

export type PlanningEntry = {
  membre_id:    string
  role_du_jour: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const ROLES = [
  {
    value:   'operateur_diffusion',
    label:   'Diffusion écrans',
    emoji:   '🖥️',
    badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    value:   'operateur_proclaim',
    label:   'Remplissage Proclaim',
    emoji:   '⌨️',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
  },
] as const

const FILTRE_OPTIONS = [
  { value: 'tous',      label: 'Tous' },
  { value: 'diffusion', label: '🖥️ Diffusion écrans' },
  { value: 'proclaim',  label: '⌨️ Remplissage Proclaim' },
  { value: 'inactifs',  label: 'Inactifs' },
] as const

type FiltreValue = typeof FILTRE_OPTIONS[number]['value']

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-amber-600', 'bg-rose-500', 'bg-teal-500', 'bg-cyan-500',
  'bg-fuchsia-500', 'bg-orange-500',
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(prenom: string, nom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
}

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (name.charCodeAt(i) + ((hash << 5) - hash)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function buildStatsMap(planning: PlanningEntry[]): Map<string, { diffusion: number; proclaim: number }> {
  const map = new Map<string, { diffusion: number; proclaim: number }>()
  for (const p of planning) {
    const s = map.get(p.membre_id) ?? { diffusion: 0, proclaim: 0 }
    if (p.role_du_jour === 'operateur_diffusion') s.diffusion++
    else if (p.role_du_jour === 'operateur_proclaim') s.proclaim++
    map.set(p.membre_id, s)
  }
  return map
}

// ── MembreModal ──────────────────────────────────────────────────────────────

type ModalFormState = {
  prenom:    string
  nom:       string
  telephone: string
  email:     string
  roles:     string[]
  notes:     string
}

function MembreModal({
  open,
  membre,
  onOpenChange,
  onSuccess,
}: {
  open:         boolean
  membre:       Membre | null
  onOpenChange: (v: boolean) => void
  onSuccess:    () => void
}) {
  const isEdit = !!membre

  const blankForm = (): ModalFormState => ({
    prenom:    membre?.prenom    ?? '',
    nom:       membre?.nom       ?? '',
    telephone: membre?.telephone ?? '',
    email:     membre?.email     ?? '',
    roles:     membre?.roles     ? [...membre.roles] : [],
    notes:     membre?.notes     ?? '',
  })

  const [form, setForm]       = useState<ModalFormState>(blankForm)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Re-init form when modal opens or membre changes
  const prevOpenRef = useRef(false)
  if (open && !prevOpenRef.current) {
    prevOpenRef.current = true
    const fresh = blankForm()
    // Only sync if different (avoids re-render loop)
    if (JSON.stringify(fresh) !== JSON.stringify(form)) setForm(fresh)
  }
  if (!open && prevOpenRef.current) {
    prevOpenRef.current = false
  }

  function set(field: keyof ModalFormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleRole(val: string) {
    setForm(prev => ({
      ...prev,
      roles: prev.roles.includes(val)
        ? prev.roles.filter(r => r !== val)
        : [...prev.roles, val],
    }))
  }

  function handleOpenChange(v: boolean) {
    if (!v) setError(null)
    onOpenChange(v)
  }

  async function handleSubmit() {
    if (!form.prenom.trim() || !form.nom.trim()) {
      setError('Prénom et nom sont obligatoires.')
      return
    }
    if (form.roles.length === 0) {
      setError('Sélectionnez au moins un rôle.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const payload = {
        prenom:    form.prenom.trim(),
        nom:       form.nom.trim(),
        telephone: form.telephone.trim() || null,
        email:     form.email.trim()     || null,
        roles:     form.roles,
        notes:     form.notes.trim()     || null,
      }
      const res = isEdit && membre
        ? await updateMembreAction(membre.id, payload)
        : await createMembreAction(payload)

      if (res.error) { setError(res.error); return }
      handleOpenChange(false)
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifier le membre' : 'Ajouter un membre'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Mettez à jour les informations du membre.'
              : 'Ajoutez un nouveau membre à l\'équipe projection.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Prénom + Nom */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="modal-prenom">
                Prénom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="modal-prenom"
                value={form.prenom}
                onChange={e => set('prenom', e.target.value)}
                placeholder="Jean"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modal-nom">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="modal-nom"
                value={form.nom}
                onChange={e => set('nom', e.target.value)}
                placeholder="Dupont"
              />
            </div>
          </div>

          {/* Téléphone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="modal-tel">Téléphone</Label>
              <Input
                id="modal-tel"
                value={form.telephone}
                onChange={e => set('telephone', e.target.value)}
                placeholder="06 12 34 56 78"
                type="tel"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modal-email">Email</Label>
              <Input
                id="modal-email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="jean@email.com"
                type="email"
              />
            </div>
          </div>

          {/* Rôles */}
          <div className="space-y-1.5">
            <Label>
              Rôles <span className="text-destructive">*</span>
              <span className="text-muted-foreground font-normal ml-1">(au moins 1)</span>
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {ROLES.map(role => {
                const checked = form.roles.includes(role.value)
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => toggleRole(role.value)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      checked
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border hover:border-muted-foreground/40 bg-card'
                    }`}
                  >
                    {/* Custom checkbox */}
                    <div
                      className={`h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                        checked
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground/40'
                      }`}
                    >
                      {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                    <span className="text-base leading-none">{role.emoji}</span>
                    <span className="text-sm font-medium">{role.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="modal-notes">
              Notes <span className="text-muted-foreground font-normal">(optionnel)</span>
            </Label>
            <Textarea
              id="modal-notes"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="ex : Disponible seulement le matin"
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Ajouter le membre'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── MemberCard ───────────────────────────────────────────────────────────────

function MemberCard({
  membre,
  totalCultes,
  onEdit,
  onToggle,
  isAdmin,
  onDeleted,
}: {
  membre:      Membre
  totalCultes: number
  onEdit:      (m: Membre) => void
  onToggle:    (id: string, actif: boolean) => void
  isAdmin:     boolean
  onDeleted:   (id: string) => void
}) {
  function handleSupprimer() {
    if (!confirm(`Supprimer définitivement ${membre.prenom} ${membre.nom} ? Cette action est irréversible.`)) return
    supprimerMembreProjectionAction(membre.id).then(res => {
      if (res.error) { toast.error(res.error); return }
      toast.success('Membre supprimé')
      onDeleted(membre.id)
    })
  }
  const initials   = getInitials(membre.prenom, membre.nom)
  const avatarColor = getAvatarColor(membre.nom + membre.prenom)

  return (
    <Card className={membre.actif ? '' : 'opacity-60'}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${avatarColor}`}
          >
            {initials}
          </div>

          {/* Name + roles */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-tight truncate">
              {membre.prenom} {membre.nom}
            </p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {ROLES.filter(r => membre.roles.includes(r.value)).map(r => (
                <Badge
                  key={r.value}
                  variant="outline"
                  className={`text-[11px] px-1.5 py-0 h-5 gap-0.5 ${r.badgeCls}`}
                >
                  {r.emoji} {r.label}
                </Badge>
              ))}
              {membre.roles.length === 0 && (
                <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 text-muted-foreground">
                  Aucun rôle
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Contact */}
        <div className="space-y-1">
          {membre.telephone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{membre.telephone}</span>
            </div>
          )}
          {membre.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{membre.email}</span>
            </div>
          )}
          {!membre.telephone && !membre.email && (
            <p className="text-xs text-muted-foreground/60 italic">Aucun contact renseigné</p>
          )}
        </div>

        {/* Stat */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-md px-2.5 py-1.5">
          <Users className="h-3.5 w-3.5" />
          <span>
            <span className="font-semibold text-foreground">{totalCultes}</span>
            {' '}culte{totalCultes !== 1 ? 's' : ''} ce trimestre
          </span>
        </div>

        {/* Notes */}
        {membre.notes && (
          <p className="text-xs text-muted-foreground italic leading-snug line-clamp-2">
            {membre.notes}
          </p>
        )}

        {/* Footer: toggle + edit + delete */}
        <div className="flex items-center justify-between pt-1 border-t">
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Switch
                  checked={membre.actif}
                  onCheckedChange={v => onToggle(membre.id, v)}
                />
                <span className="text-xs text-muted-foreground">
                  {membre.actif ? 'Actif' : 'Inactif'}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => onEdit(membre)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSupprimer}
                title="Supprimer ce membre"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── StatsTable ───────────────────────────────────────────────────────────────

function StatsTable({
  membres,
  statsMap,
  trimestreLabel,
}: {
  membres:        Membre[]
  statsMap:       Map<string, { diffusion: number; proclaim: number }>
  trimestreLabel: string
}) {
  const rows = membres
    .map(m => {
      const s = statsMap.get(m.id) ?? { diffusion: 0, proclaim: 0 }
      return { membre: m, ...s, total: s.diffusion + s.proclaim }
    })
    .filter(r => r.total > 0 || true)  // show all
    .sort((a, b) => b.total - a.total)

  const hasDiffusion = rows.some(r => r.diffusion > 0)
  const hasProclaim  = rows.some(r => r.proclaim > 0)

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <Monitor className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">
          Participation ce trimestre
          <span className="ml-1.5 text-muted-foreground font-normal">({trimestreLabel})</span>
        </h2>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Membre</th>
              {hasDiffusion && (
                <th className="text-center px-4 py-2.5 font-medium">
                  <span className="flex items-center justify-center gap-1">
                    <span>🖥️</span>
                    <span className="hidden sm:inline">Diffusion</span>
                  </span>
                </th>
              )}
              {hasProclaim && (
                <th className="text-center px-4 py-2.5 font-medium">
                  <span className="flex items-center justify-center gap-1">
                    <span>⌨️</span>
                    <span className="hidden sm:inline">Proclaim</span>
                  </span>
                </th>
              )}
              <th className="text-center px-4 py-2.5 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(r => (
              <tr key={r.membre.id} className={`${r.membre.actif ? '' : 'opacity-50'} hover:bg-muted/20`}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${getAvatarColor(r.membre.nom + r.membre.prenom)}`}
                    >
                      {getInitials(r.membre.prenom, r.membre.nom)}
                    </div>
                    <span className="font-medium">
                      {r.membre.prenom} {r.membre.nom}
                    </span>
                    {!r.membre.actif && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                        Inactif
                      </Badge>
                    )}
                  </div>
                </td>
                {hasDiffusion && (
                  <td className="text-center px-4 py-2.5 tabular-nums">
                    {r.diffusion > 0
                      ? <span className="font-semibold text-blue-700">{r.diffusion}</span>
                      : <span className="text-muted-foreground/40">—</span>}
                  </td>
                )}
                {hasProclaim && (
                  <td className="text-center px-4 py-2.5 tabular-nums">
                    {r.proclaim > 0
                      ? <span className="font-semibold text-amber-700">{r.proclaim}</span>
                      : <span className="text-muted-foreground/40">—</span>}
                  </td>
                )}
                <td className="text-center px-4 py-2.5 tabular-nums">
                  {r.total > 0
                    ? <span className="font-bold">{r.total}</span>
                    : <span className="text-muted-foreground/40">0</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={2 + (hasDiffusion ? 1 : 0) + (hasProclaim ? 1 : 0)}
                  className="px-4 py-8 text-center text-sm text-muted-foreground italic"
                >
                  Aucune donnée de participation ce trimestre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── EquipeClient ─────────────────────────────────────────────────────────────

export default function EquipeClient({
  membres:        initialMembres,
  planning,
  trimestreLabel,
  isAdmin,
}: {
  membres:        Membre[]
  planning:       PlanningEntry[]
  trimestreLabel: string
  isAdmin:        boolean
}) {
  const router = useRouter()

  const [membres, setMembres]           = useState<Membre[]>(initialMembres)
  const [filtreRole, setFiltreRole]     = useState<FiltreValue>('tous')
  const [isModalOpen, setIsModalOpen]   = useState(false)
  const [editingMembre, setEditingMembre] = useState<Membre | null>(null)

  // ── Derived ───────────────────────────────────────────────────────────────

  const statsMap = useMemo(() => buildStatsMap(planning), [planning])

  const filteredMembres = useMemo(() => {
    switch (filtreRole) {
      case 'diffusion':
        return membres.filter(m => m.actif && m.roles.includes('operateur_diffusion'))
      case 'proclaim':
        return membres.filter(m => m.actif && m.roles.includes('operateur_proclaim'))
      case 'inactifs':
        return membres.filter(m => !m.actif)
      default:
        return membres.filter(m => m.actif)
    }
  }, [membres, filtreRole])

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleToggleActif(id: string, newActif: boolean) {
    setMembres(prev => prev.map(m => m.id === id ? { ...m, actif: newActif } : m))
    const res = await toggleActifAction(id, newActif)
    if (res.error) {
      setMembres(prev => prev.map(m => m.id === id ? { ...m, actif: !newActif } : m))
    }
  }

  function handleDeleted(id: string) {
    setMembres(prev => prev.filter(m => m.id !== id))
  }

  function openEdit(m: Membre) {
    setEditingMembre(m)
    setIsModalOpen(true)
  }

  function openCreate() {
    setEditingMembre(null)
    setIsModalOpen(true)
  }

  function handleModalSuccess() {
    router.refresh()
  }

  // ── Counts for filter badges ──────────────────────────────────────────────

  const counts = useMemo(() => ({
    tous:      membres.filter(m => m.actif).length,
    diffusion: membres.filter(m => m.actif && m.roles.includes('operateur_diffusion')).length,
    proclaim:  membres.filter(m => m.actif && m.roles.includes('operateur_proclaim')).length,
    inactifs:  membres.filter(m => !m.actif).length,
  }), [membres])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">

        {/* Filter buttons */}
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/30 p-1 flex-wrap">
          {FILTRE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFiltreRole(opt.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filtreRole === opt.value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
              <span className={`text-xs rounded-full px-1.5 py-0 ${
                filtreRole === opt.value
                  ? 'bg-muted text-muted-foreground'
                  : 'text-muted-foreground/60'
              }`}>
                {counts[opt.value]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Ajouter un membre
        </Button>
      </div>

      {/* ── Members grid ─────────────────────────────────────────────── */}
      {filteredMembres.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembres.map(m => {
            const s     = statsMap.get(m.id) ?? { diffusion: 0, proclaim: 0 }
            const total = s.diffusion + s.proclaim
            return (
              <MemberCard
                key={m.id}
                membre={m}
                totalCultes={total}
                onEdit={openEdit}
                onToggle={handleToggleActif}
                isAdmin={isAdmin}
                onDeleted={handleDeleted}
              />
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border bg-card py-16 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">
              {filtreRole === 'inactifs'
                ? 'Aucun membre inactif'
                : 'Aucun membre dans cette catégorie'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {membres.length === 0
                ? 'Commencez par ajouter les membres de votre équipe.'
                : 'Modifiez les filtres ou ajoutez un membre.'}
            </p>
          </div>
          {membres.length === 0 && (
            <Button className="gap-2 mt-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Ajouter un membre
            </Button>
          )}
        </div>
      )}

      {/* ── Stats table ──────────────────────────────────────────────── */}
      {membres.length > 0 && (
        <StatsTable
          membres={membres}
          statsMap={statsMap}
          trimestreLabel={trimestreLabel}
        />
      )}

      {/* ── Modal ────────────────────────────────────────────────────── */}
      <MembreModal
        open={isModalOpen}
        membre={editingMembre}
        onOpenChange={setIsModalOpen}
        onSuccess={handleModalSuccess}
      />
    </>
  )
}
