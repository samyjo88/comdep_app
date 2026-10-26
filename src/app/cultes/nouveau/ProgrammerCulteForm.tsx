'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Bell, BookOpenText, CalendarPlus, Loader2, Megaphone, Monitor, Music, Video, Volume2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ChampsEquipe, classeSelect } from '@/components/cultes/ChampsEquipe'
import { programmerCulte } from '../actions'
import type { EquipesDisponibles } from '@/lib/cultes'
import { ROLES_CONFIG } from '@/types/captation'
import {
  ROLES_PROJECTION, ROLES_SON, TYPES_CULTE, typeParDefaut, type TypeCulte,
} from '@/types/cultes'
import { cn } from '@/lib/utils'

function prochainDimanche(): string {
  const d = new Date()
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const HEURE_PAR_TYPE: Record<TypeCulte, string> = { dominical: '09:00', semaine: '18:30', special: '09:00' }

interface Props {
  equipes:      EquipesDisponibles
  dateInitiale?: string
  acces: { annonces: boolean; son: boolean; captation: boolean; projection: boolean }
}

function Section({ icon: Icon, module, titre, description, children }: {
  icon: typeof Volume2; module: string; titre: string; description: string; children: React.ReactNode
}) {
  return (
    <section data-module={module} className="space-y-4 rounded-2xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-module/10 text-module">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div>
          <h2 className="font-display text-base font-semibold">{titre}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export function ProgrammerCulteForm({ equipes, dateInitiale, acces }: Props) {
  const router = useRouter()
  const [enCours, demarrer] = useTransition()

  const [date, setDate]           = useState(dateInitiale ?? prochainDimanche())
  const [type, setType]           = useState<TypeCulte>(typeParDefaut(dateInitiale ?? prochainDimanche()))
  const [typeTouche, setTypeTouche] = useState(false)
  const [heure, setHeure]         = useState(HEURE_PAR_TYPE[typeParDefaut(dateInitiale ?? prochainDimanche())])
  const [heureTouchee, setHeureTouchee] = useState(false)
  const [libelle, setLibelle]     = useState('')
  const [theme, setTheme]         = useState('')
  const [predicateur, setPredicateur] = useState('')
  const [annonces, setAnnonces]   = useState(acces.annonces)
  const [cantiques, setCantiques] = useState(true)
  const [son, setSon]             = useState<Record<string, string | null>>({})
  const [captation, setCaptation] = useState<Record<string, string | null>>({})
  const [projection, setProjection] = useState<Record<string, string | null>>({})
  const [prevenir, setPrevenir]   = useState(true)
  const [existant, setExistant]   = useState<string | null>(null)

  const jour = useMemo(
    () => new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long' }),
    [date],
  )

  function changerDate(v: string) {
    setDate(v)
    setExistant(null)
    if (!v) return
    const t = typeParDefaut(v)
    if (!typeTouche) setType(t)
    if (!heureTouchee) setHeure(HEURE_PAR_TYPE[typeTouche ? type : t])
  }

  const nbDesignes = [son, captation, projection].reduce(
    (n, e) => n + Object.values(e).filter(Boolean).length, 0,
  )

  function soumettre(e: React.FormEvent) {
    e.preventDefault()
    demarrer(async () => {
      const res = await programmerCulte({
        culte: {
          date_culte:  date,
          heure_debut: heure || null,
          type_culte:  type,
          libelle:     libelle.trim() || null,
          theme:       theme.trim() || null,
          predicateur: predicateur.trim() || null,
        },
        annonces, cantiques, son, captation, projection,
        prevenir: prevenir && nbDesignes > 0,
      })
      if (res.error || !res.id) {
        if (res.existant) setExistant(res.existant)
        toast.error(res.error ?? 'Erreur lors de la programmation')
        return
      }
      for (const a of res.avertissements ?? []) toast.warning(a)
      toast.success(
        prevenir && nbDesignes > 0
          ? 'Culte programmé, les personnes désignées ont été prévenues'
          : 'Culte programmé',
      )
      router.push(`/cultes/${res.id}`)
    })
  }

  return (
    <form onSubmit={soumettre} className="space-y-5">
      {/* ── Le culte ── */}
      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="font-display text-base font-semibold">Le culte</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" required value={date} onChange={e => changerDate(e.target.value)} className="h-10 rounded-lg" />
            {date && <p className="text-xs capitalize text-muted-foreground">{jour}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="heure">Heure</Label>
            <Input id="heure" type="time" value={heure} onChange={e => { setHeure(e.target.value); setHeureTouchee(true) }} className="h-10 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <select
              id="type" className={classeSelect} value={type}
              onChange={e => { setType(e.target.value as TypeCulte); setTypeTouche(true) }}
            >
              {Object.entries(TYPES_CULTE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="libelle">Nom du culte <span className="font-normal text-muted-foreground">(facultatif)</span></Label>
            <Input id="libelle" value={libelle} onChange={e => setLibelle(e.target.value)} placeholder="Ex. Culte d'action de grâce, veillée de prière…" className="h-10 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="theme">Thème</Label>
            <Input id="theme" value={theme} onChange={e => setTheme(e.target.value)} className="h-10 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="predicateur">Prédicateur</Label>
            <Input id="predicateur" value={predicateur} onChange={e => setPredicateur(e.target.value)} className="h-10 rounded-lg" />
          </div>
        </div>

        {existant && (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
            Un culte est déjà programmé ce jour-là.{' '}
            <Link href={`/cultes/${existant}`} className="font-semibold underline">Ouvrir sa fiche</Link>
          </p>
        )}
      </section>

      {/* ── À préparer ── */}
      <section className="space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="font-display text-base font-semibold">À préparer</h2>
        <label className={cn('flex items-center justify-between gap-4 rounded-xl border p-3', !acces.annonces && 'opacity-50')}>
          <span className="flex items-center gap-3 text-sm">
            <Megaphone className="h-4 w-4 text-module-annonces" />
            <span>
              <span className="font-medium">Annonces du culte</span>
              <span className="block text-xs text-muted-foreground">Crée la fiche d&apos;annonces avec ses rubriques</span>
            </span>
          </span>
          <Switch checked={annonces} onCheckedChange={setAnnonces} disabled={!acces.annonces} />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-xl border p-3">
          <span className="flex items-center gap-3 text-sm">
            <Music className="h-4 w-4 text-module-projection" />
            <span>
              <span className="font-medium">Liste des cantiques</span>
              <span className="block text-xs text-muted-foreground">Crée la liste à remplir pour la projection</span>
            </span>
          </span>
          <Switch checked={cantiques} onCheckedChange={setCantiques} />
        </label>
      </section>

      {/* ── Équipes ── */}
      {acces.son && (
        <Section icon={Volume2} module="son" titre="Sonorisation" description="Qui sera à la sono pour ce culte ?">
          {equipes.son.length === 0
            ? <p className="text-sm text-muted-foreground">Aucun membre actif dans l&apos;équipe son.</p>
            : <ChampsEquipe roles={ROLES_SON} membres={equipes.son} valeurs={son} onChange={(r, v) => setSon(s => ({ ...s, [r]: v }))} />}
        </Section>
      )}

      {acces.captation && (
        <Section icon={Video} module="captation" titre="Captation" description="Qui filme et prend les photos ?">
          {equipes.captation.length === 0
            ? <p className="text-sm text-muted-foreground">Aucun membre actif dans l&apos;équipe captation.</p>
            : <ChampsEquipe roles={ROLES_CONFIG.map(r => ({ code: r.code, label: `${r.icone} ${r.label}` }))} membres={equipes.captation} valeurs={captation} filtrerParRole onChange={(r, v) => setCaptation(s => ({ ...s, [r]: v }))} />}
        </Section>
      )}

      {acces.projection && (
        <Section icon={Monitor} module="projection" titre="Projection" description="Qui projette les cantiques et assure la diffusion ?">
          {equipes.projection.length === 0
            ? <p className="text-sm text-muted-foreground">Aucun membre actif dans l&apos;équipe projection.</p>
            : <ChampsEquipe roles={ROLES_PROJECTION} membres={equipes.projection} valeurs={projection} filtrerParRole onChange={(r, v) => setProjection(s => ({ ...s, [r]: v }))} />}
        </Section>
      )}

      {/* ── Envoi ── */}
      <div className="sticky bottom-20 z-10 flex flex-col gap-3 rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
        <label className={cn('flex items-center gap-3 text-sm', nbDesignes === 0 && 'opacity-50')}>
          <Switch checked={prevenir && nbDesignes > 0} onCheckedChange={setPrevenir} disabled={nbDesignes === 0} />
          <span className="flex items-center gap-1.5">
            <Bell className="h-4 w-4 text-muted-foreground" />
            {nbDesignes === 1
              ? 'Prévenir la personne désignée'
              : `Prévenir les ${nbDesignes > 1 ? `${nbDesignes} ` : ''}personnes désignées`} (notification et e-mail)
          </span>
        </label>
        <Button type="submit" size="lg" disabled={enCours || !date} className="shrink-0">
          {enCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
          Programmer le culte
        </Button>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <BookOpenText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        L&apos;équipe son reçoit aussi un rappel automatique 48 h avant le culte, et les responsables son sont relancés
        si personne n&apos;est désigné 3 jours avant.
      </p>
    </form>
  )
}
