'use client'

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ChevronDown, Sparkles, CheckCircle2, Loader2,
  Plus, Trash2, Save, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { sauvegarderRubrique, validerTexteIA } from './actions'
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
  DEFAULT_EVENEMENT,
  DEFAULT_INFO_LOCALE,
  STRUCTURES_EGLISE,
  TYPES_CULTE,
  type SalutationData,
  type CultePrecedentData,
  type CulteJourData,
  type ConferenceData,
  type DistrictData,
  type CircuitData,
  type EgliseLocaleData,
  type EvenementItem,
  type CourierItem,
  type InfoLocaleItem,
  type TypeCulte,
  type TypeOuverture,
  type TypeInfoLocale,
  type StructureEglise,
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

// ── Types IA ───────────────────────────────────────────────────────────────

interface IaState {
  loading:  boolean
  texte:    string | null
  tokens:   number | null
  genereLe: Date | null
  valide:   boolean
}

const DEFAULT_IA: IaState = { loading: false, texte: null, tokens: null, genereLe: null, valide: false }

// ── Bouton IA ──────────────────────────────────────────────────────────────

function BoutonIA({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={loading}
      className="gap-2 border-violet-200 text-violet-600 hover:text-violet-700 hover:border-violet-300 bg-violet-50/50"
    >
      {loading
        ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération en cours…</>
        : <><Sparkles className="h-4 w-4" /> Générer avec l&apos;IA →</>
      }
    </Button>
  )
}

// ── Zone texte IA ──────────────────────────────────────────────────────────

function ZoneIA({
  texte, tokens, genereLe, loading,
  onChange, onRegenerate, onValider,
}: {
  texte:        string
  tokens:       number | null
  genereLe:     Date | null
  loading:      boolean
  onChange:     (t: string) => void
  onRegenerate: () => void
  onValider:    () => void
}) {
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
        <span className="text-sm font-semibold text-violet-700">Texte généré par l&apos;IA</span>
        {genereLe && (
          <span className="ml-auto text-xs text-muted-foreground">
            Généré à {genereLe.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {tokens ? ` · ~${tokens} tokens utilisés` : ''}
          </span>
        )}
      </div>
      <Textarea
        value={texte}
        onChange={e => onChange(e.target.value)}
        rows={6}
        className="bg-white border-violet-200 focus-visible:ring-violet-300 text-sm"
      />
      <div className="flex items-center gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={loading}
          className="gap-1.5 text-violet-600 border-violet-200 hover:border-violet-300"
        >
          {loading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <RefreshCw className="h-3.5 w-3.5" />
          }
          Regénérer
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onValider}
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Valider ce texte
        </Button>
      </div>
    </div>
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

function SousTitre({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
      {children}
    </p>
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

// ── Liste de textes (assistants, groupes, références…) ────────────────────

function ListeTexte({
  items, onChange, placeholder, labelAjout, max,
}: {
  items:       string[]
  onChange:    (items: string[]) => void
  placeholder: string
  labelAjout:  string
  max?:        number
}) {
  function add()             { onChange([...items, '']) }
  function remove(i: number) { onChange(items.filter((_, idx) => idx !== i)) }
  function patch(i: number, v: string) {
    onChange(items.map((item, idx) => idx === i ? v : item))
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input value={item} onChange={e => patch(i, e.target.value)} placeholder={placeholder} />
          <BoutonSupprimer onClick={() => remove(i)} />
        </div>
      ))}
      {(max === undefined || items.length < max) && (
        <BoutonAjouter onClick={add} label={labelAjout} />
      )}
    </div>
  )
}

// ── Sélecteur type de culte ────────────────────────────────────────────────

function ChampsTypeCulte({
  typeCulte, nomJournee, onChange,
}: {
  typeCulte:  TypeCulte
  nomJournee: string
  onChange:   (patch: { type_culte?: TypeCulte; nom_journee?: string }) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Champ label="Type de culte">
        <Select value={typeCulte} onValueChange={v => onChange({ type_culte: v as TypeCulte })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TYPES_CULTE.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Champ>
      {typeCulte === 'journee_dedicacee' && (
        <Champ label="Nom de la journée" required>
          <Input
            value={nomJournee}
            onChange={e => onChange({ nom_journee: e.target.value })}
            placeholder="ex : Journée de la Femme"
          />
        </Champ>
      )}
    </div>
  )
}

// ── Bloc officiants (culte précédent & culte du jour) ──────────────────────

function BlocOfficiants({
  president, officiant, assistants, autresPresences, labelOfficiant, onChange,
}: {
  president:       string
  officiant:       string
  assistants:      string[]
  autresPresences: string[]
  labelOfficiant:  string
  onChange: (patch: {
    president_culte?: string
    officiant?:       string
    assistants?:      string[]
    autres_presences?: string[]
  }) => void
}) {
  return (
    <div>
      <SousTitre>Officiants</SousTitre>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Champ label="Président du culte" required>
          <Input value={president} onChange={e => onChange({ president_culte: e.target.value })} placeholder="ex : Révérend N'Guessan" />
        </Champ>
        <Champ label={labelOfficiant} required>
          <Input value={officiant} onChange={e => onChange({ officiant: e.target.value })} placeholder="ex : Pasteur Martin" />
        </Champ>
        <Champ label="Assistants">
          <ListeTexte
            items={assistants}
            onChange={v => onChange({ assistants: v })}
            placeholder="Nom de l'assistant"
            labelAjout="Ajouter un assistant"
          />
        </Champ>
        <Champ label="Autres présences notables">
          <ListeTexte
            items={autresPresences}
            onChange={v => onChange({ autres_presences: v })}
            placeholder="ex : Délégué du circuit"
            labelAjout="Ajouter une présence"
          />
        </Champ>
      </div>
    </div>
  )
}

// ── Bloc louange (chorale + groupes) ───────────────────────────────────────

function BlocLouange({
  chorale, groupes, onChange,
}: {
  chorale:  string
  groupes:  string[]
  onChange: (patch: { chorale_principale?: string; groupes_supplementaires?: string[] }) => void
}) {
  return (
    <div>
      <SousTitre>Louange</SousTitre>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Champ label="Chorale principale">
          <Input value={chorale} onChange={e => onChange({ chorale_principale: e.target.value })} placeholder="ex : Chorale Horeb" />
        </Champ>
        <Champ label="Groupes supplémentaires">
          <ListeTexte
            items={groupes}
            onChange={v => onChange({ groupes_supplementaires: v })}
            placeholder="ex : Groupe de louange Écho"
            labelAjout="Ajouter un groupe"
          />
        </Champ>
      </div>
    </div>
  )
}

// ── Accordéon panneau ──────────────────────────────────────────────────────

function PanneauRubrique({
  titre, icone, rempli, iaValide, open, onToggle, saveStatus,
  iaContent, onGenerate, iaLoading, children,
}: {
  titre:      string
  icone:      string
  rempli:     boolean
  iaValide:   boolean
  open:       boolean
  onToggle:   () => void
  saveStatus: SaveStatus
  iaContent:  React.ReactNode
  onGenerate: () => void
  iaLoading:  boolean
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
          {iaValide && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs gap-1">
              <Sparkles className="h-3 w-3" /> IA validé
            </Badge>
          )}
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
            {iaContent}
            {/* Bouton IA en bas */}
            <div className="flex justify-end pt-2 border-t">
              <BoutonIA onClick={onGenerate} loading={iaLoading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Rubrique 1 — Salutation ────────────────────────────────────────────────

const SOMMAIRE_OPTIONS = [
  'Compte rendu du culte précédent',
  'Culte du jour',
  'Informations de la Conférence',
  'Informations du District Abidjan Nord',
  'Informations du Circuit de Angré',
  'Informations de l\'Église locale',
]

function isSalutationRemplie(d: SalutationData) {
  return d.responsable_nom.trim() !== '' && d.responsable_prenom.trim() !== ''
}

// Reprend les anciens champs verset_jour / cantique_jour dans la nouvelle ouverture
function migrerSalutation(parsed: SalutationData): SalutationData {
  const legacy = parsed as SalutationData & { verset_jour?: string; cantique_jour?: string }
  if (parsed.texte_ouverture || parsed.reference_ouverture) return parsed
  if (legacy.verset_jour) {
    return { ...parsed, type_ouverture: 'verset', reference_ouverture: legacy.verset_jour }
  }
  if (legacy.cantique_jour) {
    return { ...parsed, type_ouverture: 'chant', texte_ouverture: legacy.cantique_jour }
  }
  return parsed
}

function RubriqueSalutation({
  rubrique, onSave,
}: {
  rubrique: RubriqueAnnonce
  onSave: (data: SalutationData) => void
}) {
  const [d, setD] = useState<SalutationData>(
    () => migrerSalutation(parseOrDefault(rubrique.donnees_brutes, DEFAULT_SALUTATION))
  )

  function update(patch: Partial<SalutationData>) {
    const next = { ...d, ...patch }
    setD(next)
    onSave(next)
  }

  function toggleSommaire(option: string) {
    const sommaire = d.sommaire.includes(option)
      ? d.sommaire.filter(s => s !== option)
      : [...d.sommaire, option]
    update({ sommaire })
  }

  return (
    <div className="space-y-5">
      {/* Responsable */}
      <div>
        <SousTitre>Responsable des annonces</SousTitre>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Champ label="Titre">
            <Input value={d.titre_responsable} onChange={e => update({ titre_responsable: e.target.value })} placeholder="ex : Très Révérend" />
          </Champ>
          <Champ label="Prénom" required>
            <Input value={d.responsable_prenom} onChange={e => update({ responsable_prenom: e.target.value })} placeholder="ex : Eugène" />
          </Champ>
          <Champ label="Nom" required>
            <Input value={d.responsable_nom} onChange={e => update({ responsable_nom: e.target.value })} placeholder="ex : ASSALÉ" />
          </Champ>
        </div>
      </div>

      <Champ label="Texte de bienvenue">
        <Textarea value={d.texte_bienvenue} onChange={e => update({ texte_bienvenue: e.target.value })} placeholder="Message d'ouverture personnalisé…" rows={3} />
      </Champ>

      {/* Ouverture */}
      <div>
        <SousTitre>Ouverture (verset ou chant)</SousTitre>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Champ label="Type d'ouverture">
            <Select value={d.type_ouverture} onValueChange={v => update({ type_ouverture: v as TypeOuverture })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="verset">Verset biblique</SelectItem>
                <SelectItem value="chant">Chant</SelectItem>
              </SelectContent>
            </Select>
          </Champ>
          {d.type_ouverture === 'verset' && (
            <Champ label="Référence biblique">
              <Input value={d.reference_ouverture} onChange={e => update({ reference_ouverture: e.target.value })} placeholder="ex : Philippiens 4.4" />
            </Champ>
          )}
          <Champ label={d.type_ouverture === 'verset' ? 'Texte du verset' : 'Titre du chant'} className="sm:col-span-2">
            <Textarea
              value={d.texte_ouverture}
              onChange={e => update({ texte_ouverture: e.target.value })}
              placeholder={d.type_ouverture === 'verset'
                ? 'ex : Réjouissez-vous toujours dans le Seigneur…'
                : 'ex : À Toi la gloire'}
              rows={2}
            />
          </Champ>
        </div>
      </div>

      {/* Sommaire */}
      <div>
        <SousTitre>Sommaire des rubriques à annoncer</SousTitre>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SOMMAIRE_OPTIONS.map(option => (
            <label key={option} className="flex items-center gap-2 text-sm cursor-pointer rounded-lg border px-3 py-2 hover:bg-muted/40">
              <input
                type="checkbox"
                checked={d.sommaire.includes(option)}
                onChange={() => toggleSommaire(option)}
                className="h-4 w-4 accent-primary"
              />
              {option}
            </label>
          ))}
        </div>
      </div>
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

// Reprend verset_meditation / animation_louange dans les nouveaux champs
function migrerCultePrecedent(parsed: CultePrecedentData): CultePrecedentData {
  let next = parsed
  if (next.textes_bibliques.length === 0 && next.verset_meditation) {
    next = { ...next, textes_bibliques: [next.verset_meditation] }
  }
  if (!next.chorale_principale && next.animation_louange) {
    next = { ...next, chorale_principale: next.animation_louange }
  }
  return next
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
    () => migrerCultePrecedent(parseOrDefault(rubrique.donnees_brutes, DEFAULT_CULTE_PRECEDENT))
  )

  function update(patch: Partial<CultePrecedentData>) {
    const next = { ...d, ...patch }
    setD(next)
    onSave(next)
  }

  return (
    <div className="space-y-5">
      {/* Type de culte */}
      <div>
        <SousTitre>Type de culte</SousTitre>
        <ChampsTypeCulte
          typeCulte={d.type_culte}
          nomJournee={d.nom_journee}
          onChange={p => update(p)}
        />
      </div>

      {/* Officiants */}
      <BlocOfficiants
        president={d.president_culte}
        officiant={d.officiant_principal}
        assistants={d.assistants}
        autresPresences={d.autres_presences}
        labelOfficiant="Officiant principal (prédicateur)"
        onChange={p => update({
          ...(p.president_culte !== undefined && { president_culte: p.president_culte }),
          ...(p.officiant !== undefined && { officiant_principal: p.officiant }),
          ...(p.assistants !== undefined && { assistants: p.assistants }),
          ...(p.autres_presences !== undefined && { autres_presences: p.autres_presences }),
        })}
      />

      {/* Méditation */}
      <div>
        <SousTitre>Méditation</SousTitre>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Champ label="Thème de la prédication">
            <Input value={d.theme_predication} onChange={e => update({ theme_predication: e.target.value })} placeholder="ex : Marcher dans la foi" />
          </Champ>
          <Champ label="Textes bibliques (3 max)">
            <ListeTexte
              items={d.textes_bibliques}
              onChange={v => update({ textes_bibliques: v })}
              placeholder="ex : Hébreux 11.1"
              labelAjout="Ajouter une référence"
              max={3}
            />
          </Champ>
        </div>
      </div>

      {/* Présence */}
      <div>
        <SousTitre>Assistance</SousTitre>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ChampNombre label="Assistance totale" value={d.assistance} onChange={v => update({ assistance: v })} />
          <ChampNombre label="Hommes" required value={d.hommes} onChange={v => update({ hommes: v })} />
          <ChampNombre label="Femmes" required value={d.femmes} onChange={v => update({ femmes: v })} />
          <ChampNombre label="Enfants" required value={d.enfants} onChange={v => update({ enfants: v })} />
        </div>
      </div>

      {/* Louange */}
      <BlocLouange
        chorale={d.chorale_principale}
        groupes={d.groupes_supplementaires}
        onChange={p => update(p)}
      />

      {/* Offrandes */}
      <div>
        <SousTitre>Offrandes (F CFA)</SousTitre>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ChampNombre label="Offrande ordinaire" required value={d.offrande_ordinaire} onChange={v => update({ offrande_ordinaire: v })} placeholder="ex : 45000" />
          <Champ label="Objet de l'offrande ordinaire">
            <Input value={d.objet_offrande_ordinaire} onChange={e => update({ objet_offrande_ordinaire: e.target.value })} placeholder="ex : Fonctionnement de l'église" />
          </Champ>
          <ChampNombre label="Offrande spéciale" required value={d.offrande_speciale} onChange={v => update({ offrande_speciale: v })} />
          <Champ label="Objet de l'offrande spéciale" required={d.offrande_speciale !== '' && d.offrande_speciale !== '0'}>
            <Input value={d.objet_offrande_speciale} onChange={e => update({ objet_offrande_speciale: e.target.value })} placeholder="ex : Construction de l'église" />
          </Champ>
          <ChampNombre label="Dîme" value={d.dime} onChange={v => update({ dime: v })} />
          <ChampNombre label="Offrande ECODIM" required value={d.offrande_ecodim} onChange={v => update({ offrande_ecodim: v })} />
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

function migrerCulteJour(parsed: CulteJourData): CulteJourData {
  if (!parsed.chorale_principale && parsed.animation_louange) {
    return { ...parsed, chorale_principale: parsed.animation_louange }
  }
  return parsed
}

function RubriqueCulteJour({
  rubrique, culte, onSave,
}: {
  rubrique: RubriqueAnnonce
  culte:    Culte
  onSave:   (data: CulteJourData) => void
}) {
  const [d, setD] = useState<CulteJourData>(() => {
    const parsed = migrerCulteJour(parseOrDefault(rubrique.donnees_brutes, DEFAULT_CULTE_JOUR))
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
    <div className="space-y-5">
      {/* Type de culte + heure */}
      <div>
        <SousTitre>Culte</SousTitre>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Champ label="Heure de début">
            <Input type="time" value={d.heure_debut} onChange={e => update({ heure_debut: e.target.value })} />
          </Champ>
          <Champ label="Thème de la prédication" required>
            <Input value={d.theme_predication} onChange={e => update({ theme_predication: e.target.value })} placeholder="ex : La grâce de Dieu" />
          </Champ>
        </div>
        <div className="mt-3">
          <ChampsTypeCulte
            typeCulte={d.type_culte}
            nomJournee={d.nom_journee}
            onChange={p => update(p)}
          />
        </div>
      </div>

      {/* Officiants */}
      <BlocOfficiants
        president={d.president_culte}
        officiant={d.predicateur}
        assistants={d.assistants}
        autresPresences={d.autres_presences}
        labelOfficiant="Officiant principal (prédicateur)"
        onChange={p => update({
          ...(p.president_culte !== undefined && { president_culte: p.president_culte }),
          ...(p.officiant !== undefined && { predicateur: p.officiant }),
          ...(p.assistants !== undefined && { assistants: p.assistants }),
          ...(p.autres_presences !== undefined && { autres_presences: p.autres_presences }),
        })}
      />

      {/* Louange */}
      <BlocLouange
        chorale={d.chorale_principale}
        groupes={d.groupes_supplementaires}
        onChange={p => update(p)}
      />

      {/* Offrandes prévues */}
      <div>
        <SousTitre>Offrandes prévues</SousTitre>
        <div className="space-y-3">
          <label className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <span className="text-sm font-medium">Offrande ordinaire</span>
            <Switch
              checked={d.offrande_ordinaire_prevue}
              onCheckedChange={v => update({ offrande_ordinaire_prevue: v })}
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <span className="text-sm font-medium">Offrande spéciale</span>
            <Switch
              checked={d.offrande_speciale_prevue}
              onCheckedChange={v => update({ offrande_speciale_prevue: v })}
            />
          </label>
          {d.offrande_speciale_prevue && (
            <Champ label="Objet de l'offrande spéciale" required>
              <Input value={d.offrande_speciale_objet} onChange={e => update({ offrande_speciale_objet: e.target.value })} placeholder="ex : Construction de l'église" />
            </Champ>
          )}
        </div>
      </div>

      <Champ label="Événement spécial ce jour">
        <Textarea value={d.evenement_special} onChange={e => update({ evenement_special: e.target.value })} placeholder="Baptêmes, dédicaces, consécrations…" rows={3} />
      </Champ>
    </div>
  )
}

// ── Rubriques 4-6 — Informations externes ──────────────────────────────────

function isConferenceRemplie(d: ConferenceData) {
  return d.evenements.length > 0 && d.evenements.some(e => e.titre.trim() !== '')
}

function normaliserEvenements(items: EvenementItem[]): EvenementItem[] {
  return items.map(item => ({ ...DEFAULT_EVENEMENT, ...item }))
}

function ListeEvenements({
  items, onChange,
}: {
  items:    EvenementItem[]
  onChange: (items: EvenementItem[]) => void
}) {
  function add()             { onChange([...items, { ...DEFAULT_EVENEMENT }]) }
  function remove(i: number) { onChange(items.filter((_, idx) => idx !== i)) }
  function patch(i: number, p: Partial<EvenementItem>) {
    onChange(items.map((item, idx) => idx === i ? { ...item, ...p } : item))
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input placeholder="Nom de l'événement" value={item.titre} onChange={e => patch(i, { titre: e.target.value })} />
              <Input type="date" value={item.date} onChange={e => patch(i, { date: e.target.value })} />
              <Input placeholder="Lieu" value={item.lieu} onChange={e => patch(i, { lieu: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Champ label="Heure de début">
                <Input type="time" value={item.heure_debut} onChange={e => patch(i, { heure_debut: e.target.value })} />
              </Champ>
              <Champ label="Heure de fin">
                <Input type="time" value={item.heure_fin} onChange={e => patch(i, { heure_fin: e.target.value })} />
              </Champ>
            </div>
            <Textarea
              placeholder="Consignes particulières (une par ligne)…"
              value={item.consignes}
              onChange={e => patch(i, { consignes: e.target.value })}
              rows={2}
            />
            <div className="flex flex-wrap items-end gap-3 pt-1">
              <Champ label="Annoncer jusqu'au">
                <Input type="date" value={item.date_fin} onChange={e => patch(i, { date_fin: e.target.value })} />
              </Champ>
              <label className="flex items-center gap-2 text-sm pb-2.5">
                <Switch
                  checked={item.reconductible}
                  onCheckedChange={v => patch(i, { reconductible: v })}
                />
                Reconductible
              </label>
            </div>
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
  const [d, setD] = useState<ConferenceData>(() => {
    const parsed = parseOrDefault(rubrique.donnees_brutes, DEFAULT_CONFERENCE)
    return { ...parsed, evenements: normaliserEvenements(parsed.evenements) }
  })

  function update(patch: Partial<ConferenceData>) {
    const next = { ...d, ...patch }
    setD(next)
    onSave(next)
  }

  return (
    <div className="space-y-4">
      <div>
        <SousTitre>Événements</SousTitre>
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
  const [resumePending, setResumePending] = useState<number | null>(null)

  function add()             { onChange([...items, { objet: '', contenu: '', resume_ia: '' }]) }
  function remove(i: number) { onChange(items.filter((_, idx) => idx !== i)) }
  function patch(i: number, p: Partial<CourierItem>) {
    onChange(items.map((item, idx) => idx === i ? { ...item, ...p } : item))
  }

  async function resumer(i: number) {
    const item = items[i]
    if (!item.contenu.trim()) {
      toast.error('Saisis d\'abord le contenu du courrier')
      return
    }
    setResumePending(i)
    try {
      const res = await fetch('/api/annonces/resumer-courrier', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ contenu: item.contenu, objet: item.objet }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        toast.error('Erreur lors du résumé. Vérifie ta clé API.')
        return
      }
      patch(i, { resume_ia: json.resume as string })
    } catch {
      toast.error('Erreur lors du résumé. Vérifie ta clé API.')
    } finally {
      setResumePending(null)
    }
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input placeholder="Objet du courrier" value={item.objet} onChange={e => patch(i, { objet: e.target.value })} />
            <Textarea
              placeholder="Contenu brut du courrier — l'IA en rédigera le résumé…"
              value={item.contenu}
              onChange={e => patch(i, { contenu: e.target.value })}
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => resumer(i)}
                disabled={resumePending === i}
                className="gap-1.5 text-violet-600 border-violet-200 hover:border-violet-300"
              >
                {resumePending === i
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Résumé en cours…</>
                  : <><Sparkles className="h-3.5 w-3.5" /> Résumer avec l&apos;IA</>
                }
              </Button>
            </div>
            {(item.resume_ia ?? '') !== '' && (
              <Champ label="Résumé IA (modifiable)">
                <Textarea
                  value={item.resume_ia ?? ''}
                  onChange={e => patch(i, { resume_ia: e.target.value })}
                  rows={3}
                  className="bg-white border-violet-200 focus-visible:ring-violet-300"
                />
              </Champ>
            )}
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
  const [d, setD] = useState<DistrictData>(() => {
    const parsed = parseOrDefault(rubrique.donnees_brutes, defaultData)
    return { ...parsed, evenements: normaliserEvenements(parsed.evenements) }
  })

  function update(patch: Partial<DistrictData>) {
    const next = { ...d, ...patch }
    setD(next)
    onSave(next)
  }

  return (
    <div className="space-y-5">
      <div>
        <SousTitre>Événements</SousTitre>
        <ListeEvenements items={d.evenements} onChange={ev => update({ evenements: ev })} />
      </div>
      <Champ label="Notes complémentaires (événements)">
        <Textarea value={d.notes_evenements} onChange={e => update({ notes_evenements: e.target.value })} rows={2} placeholder="Précisions sur les événements…" />
      </Champ>

      <div className="border-t pt-4">
        <SousTitre>Courriers &amp; notes d&apos;information</SousTitre>
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
  return (
    d.annonces_internes.trim() !== '' ||
    d.infos.some(i => i.structure !== '' && (i.contenu.trim() !== '' || i.evenement_nom.trim() !== ''))
  )
}

function ListeInfosLocales({
  items, onChange,
}: {
  items:    InfoLocaleItem[]
  onChange: (items: InfoLocaleItem[]) => void
}) {
  function add()             { onChange([...items, { ...DEFAULT_INFO_LOCALE }]) }
  function remove(i: number) { onChange(items.filter((_, idx) => idx !== i)) }
  function patch(i: number, p: Partial<InfoLocaleItem>) {
    onChange(items.map((item, idx) => idx === i ? { ...item, ...p } : item))
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Champ label="Structure" required>
                <Select
                  value={item.structure || undefined}
                  onValueChange={v => patch(i, { structure: v as StructureEglise })}
                >
                  <SelectTrigger><SelectValue placeholder="Choisir une structure…" /></SelectTrigger>
                  <SelectContent>
                    {STRUCTURES_EGLISE.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Champ>
              <Champ label="Type">
                <Select value={item.type} onValueChange={v => patch(i, { type: v as TypeInfoLocale })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annonce">Annonce</SelectItem>
                    <SelectItem value="evenement">Événement</SelectItem>
                    <SelectItem value="rappel">Rappel</SelectItem>
                  </SelectContent>
                </Select>
              </Champ>
            </div>

            {item.type === 'evenement' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input placeholder="Nom de l'événement" value={item.evenement_nom} onChange={e => patch(i, { evenement_nom: e.target.value })} />
                  <Input placeholder="Lieu" value={item.evenement_lieu} onChange={e => patch(i, { evenement_lieu: e.target.value })} />
                  <Input type="date" value={item.evenement_date} onChange={e => patch(i, { evenement_date: e.target.value })} />
                  <Input type="time" value={item.evenement_heure} onChange={e => patch(i, { evenement_heure: e.target.value })} />
                </div>
                <Textarea
                  placeholder="Consignes particulières (une par ligne)…"
                  value={item.consignes}
                  onChange={e => patch(i, { consignes: e.target.value })}
                  rows={2}
                />
              </>
            ) : (
              <Textarea
                placeholder={item.type === 'rappel' ? 'Texte du rappel…' : 'Texte de l\'annonce…'}
                value={item.contenu}
                onChange={e => patch(i, { contenu: e.target.value })}
                rows={3}
              />
            )}

            <div className="flex flex-wrap items-end gap-3 pt-1">
              <Champ label="Annoncer jusqu'au">
                <Input type="date" value={item.date_fin} onChange={e => patch(i, { date_fin: e.target.value })} />
              </Champ>
              <label className="flex items-center gap-2 text-sm pb-2.5">
                <Switch
                  checked={item.reconductible}
                  onCheckedChange={v => patch(i, { reconductible: v })}
                />
                Reconductible
              </label>
            </div>
          </div>
          <BoutonSupprimer onClick={() => remove(i)} />
        </div>
      ))}
      <BoutonAjouter onClick={add} label="Ajouter une information" />
    </div>
  )
}

function RubriqueEgliseLocale({
  rubrique, onSave,
}: {
  rubrique: RubriqueAnnonce
  onSave:   (data: EgliseLocaleData) => void
}) {
  const [d, setD] = useState<EgliseLocaleData>(() => {
    const parsed = parseOrDefault(rubrique.donnees_brutes, DEFAULT_EGLISE_LOCALE)
    return { ...parsed, infos: parsed.infos.map(i => ({ ...DEFAULT_INFO_LOCALE, ...i })) }
  })

  function update(patch: Partial<EgliseLocaleData>) {
    const next = { ...d, ...patch }
    setD(next)
    onSave(next)
  }

  return (
    <div className="space-y-4">
      <div>
        <SousTitre>Informations par structure</SousTitre>
        <ListeInfosLocales items={d.infos} onChange={infos => update({ infos })} />
      </div>
      <Champ label="Annonces internes générales">
        <Textarea value={d.annonces_internes} onChange={e => update({ annonces_internes: e.target.value })} placeholder="Annonces internes à la communauté…" rows={4} />
      </Champ>
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

function checkRemplie(code: string, data: unknown): boolean {
  if (!data) return false
  switch (code) {
    case 'salutation':      return isSalutationRemplie({ ...DEFAULT_SALUTATION,       ...(data as SalutationData) })
    case 'culte_precedent': return isCultePrecedentRempli({ ...DEFAULT_CULTE_PRECEDENT, ...(data as CultePrecedentData) })
    case 'culte_jour':      return isCulteJourRempli({ ...DEFAULT_CULTE_JOUR,          ...(data as CulteJourData) })
    case 'conference':      return isConferenceRemplie({ ...DEFAULT_CONFERENCE,         ...(data as ConferenceData) })
    case 'district':        return isDistrictRempli({ ...DEFAULT_DISTRICT,             ...(data as DistrictData) })
    case 'circuit':         return isDistrictRempli({ ...DEFAULT_CIRCUIT,              ...(data as CircuitData) })
    case 'eglise_local':    return isEgliseLocaleRemplie({ ...DEFAULT_EGLISE_LOCALE,   ...(data as EgliseLocaleData) })
    default:                return false
  }
}

export default function RubriquesClient({ annonceId: _annonceId, culte, rubriques }: Props) {
  const [openItem, setOpenItem] = useState<string | null>(rubriques[0]?.id ?? null)
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({})
  const [iaState, setIaState] = useState<Record<string, IaState>>(() =>
    Object.fromEntries(
      rubriques
        .filter(r => r.texte_final || r.valide)
        .map(r => [r.id, {
          loading:  false,
          texte:    r.texte_final ?? null,
          tokens:   null,
          genereLe: null,
          valide:   r.valide,
        }])
    )
  )
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Données courantes de chaque rubrique (mises à jour à chaque frappe, avant debounce)
  const latestData = useRef<Record<string, unknown>>(
    Object.fromEntries(
      rubriques
        .filter(r => r.donnees_brutes)
        .map(r => {
          try { return [r.id, JSON.parse(r.donnees_brutes!)] } catch { return [r.id, null] }
        })
        .filter(([, v]) => v !== null)
    )
  )

  const scheduleSave = useCallback((rubriqueId: string, data: unknown) => {
    latestData.current[rubriqueId] = data
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

  const handleGenerate = useCallback(async (rubrique: RubriqueAnnonce) => {
    const data = latestData.current[rubrique.id]
    if (!checkRemplie(rubrique.code_rubrique, data)) {
      toast.error('Remplis d\'abord les informations de cette rubrique')
      return
    }

    setIaState(s => ({ ...s, [rubrique.id]: { ...DEFAULT_IA, loading: true } }))

    try {
      const res = await fetch('/api/annonces/generer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rubriqueId:   rubrique.id,
          codeRubrique: rubrique.code_rubrique,
          donnees:      data ?? {},
        }),
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        toast.error('Erreur de génération. Vérifie ta clé API.')
        setIaState(s => ({ ...s, [rubrique.id]: { ...DEFAULT_IA } }))
        return
      }

      setIaState(s => ({
        ...s,
        [rubrique.id]: {
          loading:  false,
          texte:    json.texte_genere as string,
          tokens:   json.tokens_utilises as number,
          genereLe: new Date(),
          valide:   false,
        },
      }))
    } catch {
      toast.error('Erreur de génération. Vérifie ta clé API.')
      setIaState(s => ({ ...s, [rubrique.id]: { ...DEFAULT_IA } }))
    }
  }, [])

  const handleValider = useCallback(async (rubriqueId: string, texte: string) => {
    const result = await validerTexteIA(rubriqueId, texte)
    if (result.error) {
      toast.error('Erreur lors de la validation du texte')
      return
    }
    setIaState(s => ({ ...s, [rubriqueId]: { ...s[rubriqueId], valide: true } }))
    toast.success('Texte validé !')
  }, [])

  // Trouver une rubrique par code
  function r(code: string) {
    return rubriques.find(rb => rb.code_rubrique === code)!
  }

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
      return checkRemplie(rubrique.code_rubrique, data)
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
          const ia   = iaState[rubrique.id] ?? DEFAULT_IA

          const iaContent = ia.texte !== null ? (
            <ZoneIA
              texte={ia.texte}
              tokens={ia.tokens}
              genereLe={ia.genereLe}
              loading={ia.loading}
              onChange={t => setIaState(s => ({ ...s, [rubrique.id]: { ...s[rubrique.id], texte: t } }))}
              onRegenerate={() => handleGenerate(rubrique)}
              onValider={() => handleValider(rubrique.id, ia.texte!)}
            />
          ) : null

          return (
            <PanneauRubrique
              key={rubrique.id}
              titre={titre}
              icone={icone}
              rempli={isRemplie(rubrique)}
              iaValide={ia.valide}
              open={open}
              onToggle={() => setOpenItem(open ? null : rubrique.id)}
              saveStatus={saveStatus[rubrique.id] ?? 'idle'}
              iaContent={iaContent}
              onGenerate={() => handleGenerate(rubrique)}
              iaLoading={ia.loading}
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
