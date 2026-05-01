'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ChevronDown, Sparkles, CheckCircle2, Loader2,
  Plus, Trash2, Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { sauvegarderRubrique } from './actions'
import type { RubriqueAnnonce } from '@/lib/annonces'
import type { Culte } from '@/lib/annonces'
import {
  DEFAULT_SALUTATION,
  DEFAULT_CULTE_PRECEDENT,
  DEFAULT_CULTE_JOUR,
  DEFAULT_CONFERENCE,
  DEFAULT_DISTRICT,
  DEFAULT_CIRCUIT,
  DEFAULT_EGLISE_LOCALE,
  type SalutationData,
  type CultePrecedentData,
  type CulteJourData,
  type ConferenceData,
  type DistrictData,
  type CircuitData,
  type EgliseLocaleData,
  type EvenementItem,
  type CourierItem,
  type EvenementLocalItem,
} from '@/types/rubriques-data'

// ── Helpers ────────────────────────────────────────────────────────────────

function parseOrDefault<T>(json: string | null | undefined, def: T): T {
  if (!json) return def
  try { return { ...def, ...JSON.parse(json) } as T } catch { return def }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatDateLongue(dateStr: string) {
  return capitalize(
    new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  )
}

// ── Save status ────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'pending' | 'saved' | 'error'

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  return (
    <span className={cn(
      'flex items-center gap-1 text-xs font-medium transition-all',
      status === 'pending' ? 'text-muted-foreground' :
      status === 'saved'   ? 'text-emerald-600' :
                             'text-destructive',
    )}>
      {status === 'pending' && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === 'saved'   && <CheckCircle2 className="h-3 w-3" />}
      {status === 'pending' ? 'Enregistrement…' : status === 'saved' ? 'Sauvegardé' : 'Erreur'}
    </span>
  )
}

// ── Bouton IA ──────────────────────────────────────────────────────────────

function BoutonIA() {
  return (
    <Button
      type="button"
      disabled
      variant="outline"
      className="gap-2 border-violet-200 text-violet-500 hover:text-violet-600 hover:border-violet-300 bg-violet-50/50 opacity-70 cursor-not-allowed"
    >
      <Sparkles className="h-4 w-4" />
      Générer avec l&apos;IA
    </Button>
  )
}

// ── Champ commun ───────────────────────────────────────────────────────────

function Champ({
  label, required, children, className,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

// ── Boutons liste répétable ────────────────────────────────────────────────

function BoutonAjouter({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-primary hover:underline py-1"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  )
}

function BoutonSupprimer({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-muted-foreground hover:text-destructive transition-colors mt-1"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

// ── Accordéon panneau ──────────────────────────────────────────────────────

function PanneauRubrique({
  titre, icone, rempli, open, onToggle, saveStatus, children,
}: {
  titre:      string
  icone:      string
  rempli:     boolean
  open:       boolean
  onToggle:   () => void
  saveStatus: SaveStatus
  children:   React.ReactNode
}) {
  return (
    <div className={cn(
      'rounded-xl border bg-card transition-shadow',
      open ? 'shadow-md' : 'shadow-sm hover:shadow',
    )}>
      {/* En-tête cliquable */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="text-xl shrink-0" aria-hidden>{icone}</span>
        <span className="flex-1 font-semibold text-sm leading-snug">{titre}</span>
        <div className="flex items-center gap-2 shrink-0">
          <SaveIndicator status={saveStatus} />
          {rempli ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs gap-1">
              <CheckCircle2 className="h-3 w-3" /> Rempli
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              À remplir
            </Badge>
          )}
          <ChevronDown className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )} />
        </div>
      </button>

      {/* Contenu avec animation grid */}
      <div className={cn(
        'grid transition-all duration-200 ease-in-out',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}>
        <div className="overflow-hidden">
          <div className="px-4 pb-5 pt-1 space-y-5 border-t">
            {children}
            {/* Bouton IA en bas */}
            <div className="flex justify-end pt-2 border-t">
              <BoutonIA />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Rubrique 1 — Salutation ────────────────────────────────────────────────

function isSalutationRemplie(d: SalutationData) {
  return d.responsable_nom.trim() !== '' && d.responsable_prenom.trim() !== ''
}

function RubriqueSalutation({
  rubrique, onSave,
}: {
  rubrique: RubriqueAnnonce
  onSave: (data: SalutationData) => void
}) {
  const [d, setD] = useState<SalutationData>(
    () => parseOrDefault(rubrique.donnees_brutes, DEFAULT_SALUTATION)
  )

  function update(patch: Partial<SalutationData>) {
    const next = { ...d, ...patch }
    setD(next)
    onSave(next)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Champ label="Prénom du responsable" required>
        <Input value={d.responsable_prenom} onChange={e => update({ responsable_prenom: e.target.value })} placeholder="ex : Jean" />
      </Champ>
      <Champ label="Nom du responsable" required>
        <Input value={d.responsable_nom} onChange={e => update({ responsable_nom: e.target.value })} placeholder="ex : DUPONT" />
      </Champ>
      <Champ label="Texte de bienvenue" className="sm:col-span-2">
        <Textarea value={d.texte_bienvenue} onChange={e => update({ texte_bienvenue: e.target.value })} placeholder="Message d'ouverture personnalisé…" rows={3} />
      </Champ>
      <Champ label="Verset du jour">
        <Input value={d.verset_jour} onChange={e => update({ verset_jour: e.target.value })} placeholder="ex : Jean 3:16" />
      </Champ>
      <Champ label="Cantique du jour">
        <Input value={d.cantique_jour} onChange={e => update({ cantique_jour: e.target.value })} placeholder="ex : SPM 45" />
      </Champ>
    </div>
  )
}

// ── Rubrique 2 — Culte précédent ───────────────────────────────────────────

function isCultePrecedentRempli(d: CultePrecedentData) {
  return (
    d.hommes.trim() !== '' && d.femmes.trim() !== '' &&
    d.enfants.trim() !== '' && d.offrande_ordinaire.trim() !== '' &&
    d.offrande_ecodim.trim() !== ''
  )
}

function ChampNombre({
  label, required, value, onChange, placeholder,
}: {
  label: string; required?: boolean; value: string
  onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <Champ label={label} required={required}>
      <Input
        type="number" min={0} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? '0'}
        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </Champ>
  )
}

function RubriqueCultePrecedent({
  rubrique, onSave,
}: {
  rubrique: RubriqueAnnonce
  onSave: (data: CultePrecedentData) => void
}) {
  const [d, setD] = useState<CultePrecedentData>(
    () => parseOrDefault(rubrique.donnees_brutes, DEFAULT_CULTE_PRECEDENT)
  )

  function update(patch: Partial<CultePrecedentData>) {
    const next = { ...d, ...patch }
    setD(next)
    onSave(next)
  }

  return (
    <div className="space-y-5">
      {/* Présence */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Présence</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ChampNombre label="Assistance totale" value={d.assistance} onChange={v => update({ assistance: v })} />
          <ChampNombre label="Hommes" required value={d.hommes} onChange={v => update({ hommes: v })} />
          <ChampNombre label="Femmes" required value={d.femmes} onChange={v => update({ femmes: v })} />
          <ChampNombre label="Enfants" required value={d.enfants} onChange={v => update({ enfants: v })} />
        </div>
      </div>

      {/* Offrandes */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Offrandes (F CFA)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ChampNombre label="Offrande ordinaire" required value={d.offrande_ordinaire} onChange={v => update({ offrande_ordinaire: v })} placeholder="ex : 45000" />
          <ChampNombre label="Dîme" value={d.dime} onChange={v => update({ dime: v })} />
          <ChampNombre label="Offrande spéciale" required value={d.offrande_speciale} onChange={v => update({ offrande_speciale: v })} />
          <Champ label="Objet de l'offrande spéciale" required={d.offrande_speciale !== '' && d.offrande_speciale !== '0'}>
            <Input value={d.objet_offrande_speciale} onChange={e => update({ objet_offrande_speciale: e.target.value })} placeholder="ex : Construction de l'église" />
          </Champ>
          <ChampNombre label="Offrande ECODIM" required value={d.offrande_ecodim} onChange={v => update({ offrande_ecodim: v })} />
        </div>
      </div>

      {/* Prédication */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Culte</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Champ label="Thème de la prédication">
            <Input value={d.theme_predication} onChange={e => update({ theme_predication: e.target.value })} placeholder="ex : Marcher dans la foi" />
          </Champ>
          <Champ label="Verset de méditation">
            <Input value={d.verset_meditation} onChange={e => update({ verset_meditation: e.target.value })} placeholder="ex : Hébreux 11:1" />
          </Champ>
          <Champ label="Animation louange">
            <Input value={d.animation_louange} onChange={e => update({ animation_louange: e.target.value })} placeholder="ex : Groupe de louange Écho" />
          </Champ>
        </div>
      </div>

      <Champ label="Autres informations notables">
        <Textarea value={d.autres_informations} onChange={e => update({ autres_informations: e.target.value })} placeholder="Baptêmes, consécrations, annonces spéciales…" rows={3} />
      </Champ>
    </div>
  )
}

// ── Rubrique 3 — Culte du jour ─────────────────────────────────────────────

function isCulteJourRempli(d: CulteJourData) {
  return d.theme_predication.trim() !== '' && d.predicateur.trim() !== ''
}

function RubriqueCulteJour({
  rubrique, culte, onSave,
}: {
  rubrique: RubriqueAnnonce
  culte:    Culte
  onSave:   (data: CulteJourData) => void
}) {
  const [d, setD] = useState<CulteJourData>(() => {
    const parsed = parseOrDefault(rubrique.donnees_brutes, DEFAULT_CULTE_JOUR)
    // Pré-remplir le prédicateur depuis le culte si vide
    if (!parsed.predicateur && culte.predicateur) {
      return { ...parsed, predicateur: culte.predicateur, theme_predication: culte.theme ?? parsed.theme_predication }
    }
    return parsed
  })

  function update(patch: Partial<CulteJourData>) {
    const next = { ...d, ...patch }
    setD(next)
    onSave(next)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Champ label="Heure de début">
        <Input type="time" value={d.heure_debut} onChange={e => update({ heure_debut: e.target.value })} />
      </Champ>
      <Champ label="Animation louange">
        <Input value={d.animation_louange} onChange={e => update({ animation_louange: e.target.value })} placeholder="ex : Groupe Écho" />
      </Champ>
      <Champ label="Thème de la prédication" required>
        <Input value={d.theme_predication} onChange={e => update({ theme_predication: e.target.value })} placeholder="ex : La grâce de Dieu" />
      </Champ>
      <Champ label="Prédicateur" required>
        <Input value={d.predicateur} onChange={e => update({ predicateur: e.target.value })} placeholder="ex : Pasteur Martin" />
      </Champ>
      <Champ label="Événement spécial ce jour" className="sm:col-span-2">
        <Textarea value={d.evenement_special} onChange={e => update({ evenement_special: e.target.value })} placeholder="Baptêmes, dédicaces, consécrations…" rows={3} />
      </Champ>
    </div>
  )
}

// ── Rubrique 4 — Conférence ────────────────────────────────────────────────

function isConferenceRemplie(d: ConferenceData) {
  return d.evenements.length > 0 && d.evenements.some(e => e.titre.trim() !== '')
}

function ListeEvenements({
  items, onChange,
}: {
  items:    EvenementItem[]
  onChange: (items: EvenementItem[]) => void
}) {
  function add()       { onChange([...items, { titre: '', date: '', lieu: '' }]) }
  function remove(i: number) { onChange(items.filter((_, idx) => idx !== i)) }
  function patch(i: number, k: keyof EvenementItem, v: string) {
    onChange(items.map((item, idx) => idx === i ? { ...item, [k]: v } : item))
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-lg border p-3 bg-muted/30">
            <Input placeholder="Titre de l'événement" value={item.titre} onChange={e => patch(i, 'titre', e.target.value)} />
            <Input type="date" value={item.date} onChange={e => patch(i, 'date', e.target.value)} />
            <Input placeholder="Lieu" value={item.lieu} onChange={e => patch(i, 'lieu', e.target.value)} />
          </div>
          <BoutonSupprimer onClick={() => remove(i)} />
        </div>
      ))}
      <BoutonAjouter onClick={add} label="Ajouter un événement" />
    </div>
  )
}

function RubriqueConference({
  rubrique, onSave,
}: {
  rubrique: RubriqueAnnonce
  onSave:   (data: ConferenceData) => void
}) {
  const [d, setD] = useState<ConferenceData>(
    () => parseOrDefault(rubrique.donnees_brutes, DEFAULT_CONFERENCE)
  )

  function update(patch: Partial<ConferenceData>) {
    const next = { ...d, ...patch }
    setD(next)
    onSave(next)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Événements</p>
        <ListeEvenements items={d.evenements} onChange={ev => update({ evenements: ev })} />
      </div>
      <Champ label="Notes complémentaires">
        <Textarea value={d.notes} onChange={e => update({ notes: e.target.value })} placeholder="Informations additionnelles sur la conférence…" rows={3} />
      </Champ>
    </div>
  )
}

// ── Rubrique 5 & 6 — District / Circuit (structure identique) ──────────────

function isDistrictRempli(d: DistrictData) {
  return (
    (d.evenements.length > 0 && d.evenements.some(e => e.titre.trim() !== '')) ||
    (d.courriers.length > 0 && d.courriers.some(c => c.objet.trim() !== ''))
  )
}

function ListeCourriers({
  items, onChange,
}: {
  items:    CourierItem[]
  onChange: (items: CourierItem[]) => void
}) {
  function add()       { onChange([...items, { objet: '', contenu: '' }]) }
  function remove(i: number) { onChange(items.filter((_, idx) => idx !== i)) }
  function patch(i: number, k: keyof CourierItem, v: string) {
    onChange(items.map((item, idx) => idx === i ? { ...item, [k]: v } : item))
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input placeholder="Objet du courrier" value={item.objet} onChange={e => patch(i, 'objet', e.target.value)} />
            <Textarea placeholder="Contenu / résumé…" value={item.contenu} onChange={e => patch(i, 'contenu', e.target.value)} rows={2} />
          </div>
          <BoutonSupprimer onClick={() => remove(i)} />
        </div>
      ))}
      <BoutonAjouter onClick={add} label="Ajouter un courrier" />
    </div>
  )
}

function RubriqueDistrictOuCircuit({
  rubrique, defaultData, onSave,
}: {
  rubrique:    RubriqueAnnonce
  defaultData: DistrictData | CircuitData
  onSave:      (data: DistrictData) => void
}) {
  const [d, setD] = useState<DistrictData>(
    () => parseOrDefault(rubrique.donnees_brutes, defaultData)
  )

  function update(patch: Partial<DistrictData>) {
    const next = { ...d, ...patch }
    setD(next)
    onSave(next)
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Événements</p>
        <ListeEvenements items={d.evenements} onChange={ev => update({ evenements: ev })} />
      </div>
      <Champ label="Notes complémentaires (événements)">
        <Textarea value={d.notes_evenements} onChange={e => update({ notes_evenements: e.target.value })} rows={2} placeholder="Précisions sur les événements…" />
      </Champ>

      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Courriers & notes d'information</p>
        <ListeCourriers items={d.courriers} onChange={co => update({ courriers: co })} />
      </div>
      <Champ label="Notes complémentaires (courriers)">
        <Textarea value={d.notes_courriers} onChange={e => update({ notes_courriers: e.target.value })} rows={2} placeholder="Précisions sur les courriers…" />
      </Champ>
    </div>
  )
}

// ── Rubrique 7 — Église locale ─────────────────────────────────────────────

function isEgliseLocaleRemplie(d: EgliseLocaleData) {
  return d.annonces_internes.trim() !== ''
}

function ListeEvenementsLocaux({
  items, onChange,
}: {
  items:    EvenementLocalItem[]
  onChange: (items: EvenementLocalItem[]) => void
}) {
  function add()       { onChange([...items, { titre: '', date: '' }]) }
  function remove(i: number) { onChange(items.filter((_, idx) => idx !== i)) }
  function patch(i: number, k: keyof EvenementLocalItem, v: string) {
    onChange(items.map((item, idx) => idx === i ? { ...item, [k]: v } : item))
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border p-3 bg-muted/30">
            <Input placeholder="Titre de l'événement" value={item.titre} onChange={e => patch(i, 'titre', e.target.value)} />
            <Input type="date" value={item.date} onChange={e => patch(i, 'date', e.target.value)} />
          </div>
          <BoutonSupprimer onClick={() => remove(i)} />
        </div>
      ))}
      <BoutonAjouter onClick={add} label="Ajouter un événement local" />
    </div>
  )
}

function RubriqueEgliseLocale({
  rubrique, onSave,
}: {
  rubrique: RubriqueAnnonce
  onSave:   (data: EgliseLocaleData) => void
}) {
  const [d, setD] = useState<EgliseLocaleData>(
    () => parseOrDefault(rubrique.donnees_brutes, DEFAULT_EGLISE_LOCALE)
  )

  function update(patch: Partial<EgliseLocaleData>) {
    const next = { ...d, ...patch }
    setD(next)
    onSave(next)
  }

  return (
    <div className="space-y-4">
      <Champ label="Annonces internes" required>
        <Textarea value={d.annonces_internes} onChange={e => update({ annonces_internes: e.target.value })} placeholder="Annonces internes à la communauté…" rows={4} />
      </Champ>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Événements locaux</p>
        <ListeEvenementsLocaux items={d.evenements} onChange={ev => update({ evenements: ev })} />
      </div>
      <Champ label="Appel aux dons ou besoins">
        <Textarea value={d.appel_dons} onChange={e => update({ appel_dons: e.target.value })} placeholder="Besoin d'aide pour…, collecte spéciale pour…" rows={3} />
      </Champ>
    </div>
  )
}

// ── Barre de progression ───────────────────────────────────────────────────

function BarreProgression({ remplies, total }: { remplies: number; total: number }) {
  const pct = Math.round((remplies / total) * 100)
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">Progression</span>
        <span className="text-sm font-bold tabular-nums text-primary">
          {remplies}/{total} rubriques remplies
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            pct === 100 ? 'bg-emerald-500' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {pct === 100 && (
        <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> Toutes les rubriques sont remplies !
        </p>
      )}
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  annonceId: string
  culte:     Culte
  rubriques: RubriqueAnnonce[]
}

// ── Composant principal ────────────────────────────────────────────────────

export default function RubriquesClient({ annonceId: _annonceId, culte, rubriques }: Props) {
  const [openItem, setOpenItem] = useState<string | null>(rubriques[0]?.id ?? null)
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const scheduleSave = useCallback((rubriqueId: string, data: unknown) => {
    // Annuler le timer précédent
    if (timers.current[rubriqueId]) clearTimeout(timers.current[rubriqueId])
    setSaveStatus(s => ({ ...s, [rubriqueId]: 'pending' }))
    timers.current[rubriqueId] = setTimeout(async () => {
      const result = await sauvegarderRubrique(rubriqueId, JSON.stringify(data))
      setSaveStatus(s => ({
        ...s,
        [rubriqueId]: result.error ? 'error' : 'saved',
      }))
      // Effacer l'indicateur "Sauvegardé" après 3s
      if (!result.error) {
        setTimeout(() => setSaveStatus(s => ({ ...s, [rubriqueId]: 'idle' })), 3000)
      }
    }, 2000)
  }, [])

  // Trouver une rubrique par code
  function r(code: string) {
    return rubriques.find(rb => rb.code_rubrique === code)!
  }

  // État de remplissage calculé dynamiquement
  // On track les données via refs pour le calcul (les composants gèrent leur propre state)
  // On utilise saveStatus comme proxy : une rubrique "saved" ou "pending" a été modifiée
  const rempliCount = rubriques.filter(rb => rb.valide || rb.donnees_brutes).length

  const sections = [
    { code: 'salutation',     titre: 'Salutation',             icone: '👋' },
    { code: 'culte_precedent',titre: 'Culte précédent',        icone: '📖' },
    { code: 'culte_jour',     titre: 'Culte du jour',          icone: '🎙️' },
    { code: 'conference',     titre: 'Conférence',             icone: '🏛️' },
    { code: 'district',       titre: 'District Abidjan Nord',  icone: '🗺️' },
    { code: 'circuit',        titre: 'Circuit de Angré',       icone: '🔗' },
    { code: 'eglise_local',   titre: 'Église locale',          icone: '⛪' },
  ]

  function isRemplie(rubrique: RubriqueAnnonce): boolean {
    if (!rubrique.donnees_brutes) return false
    try {
      const data = JSON.parse(rubrique.donnees_brutes)
      switch (rubrique.code_rubrique) {
        case 'salutation':      return isSalutationRemplie({ ...DEFAULT_SALUTATION,      ...data })
        case 'culte_precedent': return isCultePrecedentRempli({ ...DEFAULT_CULTE_PRECEDENT, ...data })
        case 'culte_jour':      return isCulteJourRempli({ ...DEFAULT_CULTE_JOUR,        ...data })
        case 'conference':      return isConferenceRemplie({ ...DEFAULT_CONFERENCE,       ...data })
        case 'district':        return isDistrictRempli({ ...DEFAULT_DISTRICT,           ...data })
        case 'circuit':         return isDistrictRempli({ ...DEFAULT_CIRCUIT,            ...data })
        case 'eglise_local':    return isEgliseLocaleRemplie({ ...DEFAULT_EGLISE_LOCALE, ...data })
      }
    } catch { /* */ }
    return false
  }

  const rempliesTotal = sections.filter(s => isRemplie(r(s.code))).length

  return (
    <div className="space-y-4">
      {/* Infos culte */}
      <div className="rounded-xl border bg-card px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1">
        <span className="text-sm font-semibold">
          {formatDateLongue(culte.date_culte)}
        </span>
        {culte.theme && (
          <span className="text-sm text-muted-foreground">
            Thème : <span className="text-foreground">{culte.theme}</span>
          </span>
        )}
        {culte.predicateur && (
          <span className="text-sm text-muted-foreground">
            Prédicateur : <span className="text-foreground">{culte.predicateur}</span>
          </span>
        )}
      </div>

      {/* Barre de progression */}
      <BarreProgression remplies={rempliesTotal} total={7} />

      {/* Accordéon des 7 rubriques */}
      <div className="space-y-3">
        {sections.map(({ code, titre, icone }) => {
          const rubrique = r(code)
          if (!rubrique) return null
          const open = openItem === rubrique.id

          return (
            <PanneauRubrique
              key={rubrique.id}
              titre={titre}
              icone={icone}
              rempli={isRemplie(rubrique)}
              open={open}
              onToggle={() => setOpenItem(open ? null : rubrique.id)}
              saveStatus={saveStatus[rubrique.id] ?? 'idle'}
            >
              {code === 'salutation' && (
                <RubriqueSalutation
                  rubrique={rubrique}
                  onSave={d => scheduleSave(rubrique.id, d)}
                />
              )}
              {code === 'culte_precedent' && (
                <RubriqueCultePrecedent
                  rubrique={rubrique}
                  onSave={d => scheduleSave(rubrique.id, d)}
                />
              )}
              {code === 'culte_jour' && (
                <RubriqueCulteJour
                  rubrique={rubrique}
                  culte={culte}
                  onSave={d => scheduleSave(rubrique.id, d)}
                />
              )}
              {code === 'conference' && (
                <RubriqueConference
                  rubrique={rubrique}
                  onSave={d => scheduleSave(rubrique.id, d)}
                />
              )}
              {(code === 'district' || code === 'circuit') && (
                <RubriqueDistrictOuCircuit
                  rubrique={rubrique}
                  defaultData={code === 'district' ? DEFAULT_DISTRICT : DEFAULT_CIRCUIT}
                  onSave={d => scheduleSave(rubrique.id, d)}
                />
              )}
              {code === 'eglise_local' && (
                <RubriqueEgliseLocale
                  rubrique={rubrique}
                  onSave={d => scheduleSave(rubrique.id, d)}
                />
              )}
            </PanneauRubrique>
          )
        })}
      </div>

      {/* Récapitulatif */}
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Save className="h-3.5 w-3.5" />
        Sauvegarde automatique 2 secondes après chaque modification
      </div>
    </div>
  )
}
