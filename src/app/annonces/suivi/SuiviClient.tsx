'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertTriangle, ArrowRight, CalendarClock,
  CheckCircle2, Loader2, ScrollText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  sauvegarderStatutReconduite,
  sauvegarderDateValidite,
  appliquerReconductes,
} from './actions'
import { RUBRIQUES_BY_CODE } from '@/types/annonces'
import type { CulteAvecAnnonce, RubriqueAnnonce } from '@/lib/annonces'
import type { CodeRubrique, StatutReconduite } from '@/types/annonces'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUT_OPTIONS: { value: StatutReconduite; label: string }[] = [
  { value: 'a_definir', label: '🔵 À définir' },
  { value: 'oui',       label: '✅ Reconduire' },
  { value: 'modifier',  label: '✏️ À mettre à jour' },
  { value: 'non',       label: '❌ Ne pas reconduire' },
]

function statutBadge(statut: StatutReconduite) {
  switch (statut) {
    case 'oui':      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">✅ Reconduire</Badge>
    case 'modifier': return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs">✏️ À mettre à jour</Badge>
    case 'non':      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs">❌ Ne pas reconduire</Badge>
    default:         return <Badge variant="outline" className="text-xs text-muted-foreground">🔵 À définir</Badge>
  }
}

function rowAccent(statut: StatutReconduite) {
  switch (statut) {
    case 'oui':      return 'border-l-4 border-l-emerald-400'
    case 'modifier': return 'border-l-4 border-l-amber-400'
    case 'non':      return 'border-l-4 border-l-red-400'
    default:         return 'border-l-4 border-l-transparent'
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function isExpire(dateStr: string): boolean {
  if (!dateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dateStr + 'T00:00:00') < today
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  cultePrecedent: CulteAvecAnnonce | null
  cultesAvenir:   CulteAvecAnnonce[]
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function SuiviClient({ cultePrecedent, cultesAvenir }: Props) {
  const router = useRouter()

  const annoncePrecedente  = cultePrecedent?.annonces?.[0] ?? null
  const rubriques: RubriqueAnnonce[] = (annoncePrecedente?.rubriques_annonce ?? [])
    .slice()
    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))

  const [statuts, setStatuts] = useState<Record<string, StatutReconduite>>(
    () => Object.fromEntries(rubriques.map(r => [r.id, r.reconduire]))
  )
  const [datesValidite, setDatesValidite] = useState<Record<string, string>>(
    () => Object.fromEntries(rubriques.map(r => [r.id, r.date_validite ?? '']))
  )
  const [prochainCulteId, setProchainCulteId] = useState<string>(cultesAvenir[0]?.id ?? '')
  const [applying, setApplying] = useState(false)

  const prochainCulte    = cultesAvenir.find(c => c.id === prochainCulteId) ?? null
  const annonceProchainId = prochainCulte?.annonces?.[0]?.id ?? null

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleStatutChange = useCallback(async (rubriqueId: string, statut: StatutReconduite) => {
    setStatuts(s => ({ ...s, [rubriqueId]: statut }))
    const result = await sauvegarderStatutReconduite(rubriqueId, statut)
    if (result.error) toast.error('Erreur lors de la sauvegarde du statut.')
  }, [])

  const handleDateBlur = useCallback(async (rubriqueId: string, date: string) => {
    const result = await sauvegarderDateValidite(rubriqueId, date)
    if (result.error) toast.error('Erreur lors de la sauvegarde de la date.')
  }, [])

  const handleAppliquer = useCallback(async () => {
    if (!annoncePrecedente) return
    if (!annonceProchainId) {
      toast.error('Le culte sélectionné n\'a pas encore d\'annonce. Créez-la d\'abord.')
      return
    }

    setApplying(true)
    const result = await appliquerReconductes(annoncePrecedente.id, annonceProchainId)
    setApplying(false)

    if (result.error) {
      toast.error(`Erreur : ${result.error}`)
      return
    }

    toast.success('Reconductes appliquées !')
    router.push(`/annonces/${annonceProchainId}/rubriques`)
  }, [annoncePrecedente, annonceProchainId, router])

  // ── Pas de culte précédent ───────────────────────────────────────────────

  if (!cultePrecedent || !annoncePrecedente) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800">Aucun culte précédent trouvé</p>
          <p className="text-sm text-amber-600 mt-1">
            Les reconductes sont disponibles une fois qu&apos;un culte passé a été préparé et documenté.
          </p>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── En-tête comparatif ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-muted/40 px-5 py-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Culte précédent
          </p>
          <p className="font-semibold text-sm">{formatDate(cultePrecedent.date_culte)}</p>
          {cultePrecedent.theme && (
            <p className="text-xs text-muted-foreground mt-0.5">{cultePrecedent.theme}</p>
          )}
          <Badge className="mt-2 bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 text-xs">
            {rubriques.filter(r => r.texte_final).length}/{rubriques.length} rubriques avec texte
          </Badge>
        </div>

        <div className="rounded-xl border bg-card px-5 py-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Prochain culte à préparer
            </p>
            {cultesAvenir.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun culte à venir planifié.</p>
            ) : (
              <Select value={prochainCulteId} onValueChange={setProchainCulteId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Choisir un culte…" />
                </SelectTrigger>
                <SelectContent>
                  {cultesAvenir.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {formatDate(c.date_culte)}
                      {c.annonces?.length === 0 && ' — ⚠️ sans annonce'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {prochainCulte && !annonceProchainId && (
            <div className="flex items-center gap-2 text-xs text-amber-600 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Ce culte n&apos;a pas d&apos;annonce — créez-la via &laquo; Nouveau culte &raquo;.
            </div>
          )}
        </div>
      </div>

      {/* ── Tableau principal ── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-44">Rubrique</TableHead>
              <TableHead className="w-56">Texte du culte précédent</TableHead>
              <TableHead className="w-52">Statut reconduite</TableHead>
              <TableHead className="w-40">
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" /> Date validité
                </span>
              </TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rubriques.map(rubrique => {
              const code     = rubrique.code_rubrique as CodeRubrique
              const config   = RUBRIQUES_BY_CODE[code]
              const statut   = statuts[rubrique.id] ?? 'a_definir'
              const dateVal  = datesValidite[rubrique.id] ?? ''
              const expire   = isExpire(dateVal)
              const texte    = rubrique.texte_final ?? rubrique.texte_genere

              return (
                <TableRow
                  key={rubrique.id}
                  className={cn(
                    rowAccent(statut),
                    expire && 'bg-red-50/60',
                  )}
                >
                  {/* Rubrique */}
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm flex items-center gap-1.5">
                        <span aria-hidden>{config?.icone}</span>
                        {config?.label ?? code}
                      </span>
                      {expire && (
                        <Badge className="w-fit bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs gap-1">
                          <AlertTriangle className="h-3 w-3" /> Expirée
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Extrait texte */}
                  <TableCell>
                    {texte ? (
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {texte.slice(0, 100)}{texte.length > 100 ? '…' : ''}
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground/60 italic">Aucun texte</span>
                    )}
                  </TableCell>

                  {/* Select statut */}
                  <TableCell>
                    <div className="space-y-1.5">
                      <Select
                        value={statut}
                        onValueChange={v => handleStatutChange(rubrique.id, v as StatutReconduite)}
                      >
                        <SelectTrigger className="h-8 text-xs w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUT_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {statutBadge(statut)}
                    </div>
                  </TableCell>

                  {/* Date validité */}
                  <TableCell>
                    <Input
                      type="date"
                      value={dateVal}
                      onChange={e => setDatesValidite(s => ({ ...s, [rubrique.id]: e.target.value }))}
                      onBlur={e => handleDateBlur(rubrique.id, e.target.value)}
                      className={cn(
                        'h-8 text-xs w-36',
                        expire && 'border-red-300 focus-visible:ring-red-400',
                      )}
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    {texte ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                            <ScrollText className="h-3.5 w-3.5" />
                            Voir texte
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <span aria-hidden>{config?.icone}</span>
                              {config?.label ?? code}
                            </DialogTitle>
                          </DialogHeader>
                          <p className="text-sm leading-7 whitespace-pre-wrap text-foreground mt-2">
                            {texte}
                          </p>
                          {statutBadge(statut)}
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── Légende ── */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-400" /> Reconduit tel quel
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-400" /> Données pré-remplies, texte à regénérer
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-400" /> Laissé vide
        </span>
      </div>

      {/* ── Résumé + bouton ── */}
      <div className="rounded-xl border bg-card p-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold">
            Résumé des décisions
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-emerald-700 font-medium">
              {Object.values(statuts).filter(s => s === 'oui').length} à reconduire
            </span>
            <span className="text-amber-700 font-medium">
              {Object.values(statuts).filter(s => s === 'modifier').length} à mettre à jour
            </span>
            <span className="text-red-700 font-medium">
              {Object.values(statuts).filter(s => s === 'non').length} à ne pas reconduire
            </span>
            <span className="text-muted-foreground">
              {Object.values(statuts).filter(s => s === 'a_definir').length} non décidées
            </span>
          </div>
        </div>

        <Button
          onClick={handleAppliquer}
          disabled={applying || !prochainCulteId || !annonceProchainId}
          className="gap-2 bg-primary"
        >
          {applying
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Application en cours…</>
            : <><CheckCircle2 className="h-4 w-4" /> Appliquer les reconductes <ArrowRight className="h-4 w-4" /></>
          }
        </Button>
      </div>
    </div>
  )
}
