'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  BookOpen, Copy, Loader2, Search, Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CulteAvecAnnonce } from '@/lib/annonces'
import type { StatutAnnonce } from '@/types/annonces'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  return d.charAt(0).toUpperCase() + d.slice(1)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function statutBadge(statut: StatutAnnonce | undefined) {
  switch (statut) {
    case 'valide':   return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">Validé</Badge>
    case 'publie':   return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">Publié</Badge>
    case 'brouillon':return <Badge variant="outline" className="text-xs text-muted-foreground">Brouillon</Badge>
    default:         return <Badge variant="outline" className="text-xs text-muted-foreground">Sans annonce</Badge>
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  cultes: CulteAvecAnnonce[]
}

interface DupliquerModal {
  annonceId: string
  theme:     string
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function HistoriqueClient({ cultes }: Props) {
  const router = useRouter()

  const [search, setSearch]             = useState('')
  const [anneeFilter, setAnneeFilter]   = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [dupModal, setDupModal]         = useState<DupliquerModal | null>(null)
  const [nouvelleDate, setNouvelleDate] = useState('')
  const [duplicating, setDuplicating]   = useState(false)

  // Années disponibles
  const annees = useMemo(() =>
    [...new Set(cultes.map(c => c.date_culte.slice(0, 4)))].sort().reverse()
  , [cultes])

  // Filtrage local
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return cultes.filter(c => {
      const annonce = c.annonces?.[0]
      if (anneeFilter && !c.date_culte.startsWith(anneeFilter)) return false
      if (statutFilter && annonce?.statut_global !== statutFilter) return false
      if (q) {
        const haystack = [c.theme, c.predicateur].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [cultes, anneeFilter, statutFilter, search])

  // ── Dupliquer ────────────────────────────────────────────────────────────

  async function handleDupliquer() {
    if (!dupModal || !nouvelleDate) return
    setDuplicating(true)
    try {
      const res = await fetch('/api/annonces/dupliquer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ annonce_id: dupModal.annonceId, date_culte: nouvelleDate }),
      })
      const json = await res.json() as { id?: string; error?: string }
      if (!res.ok || !json.id) {
        toast.error(json.error ?? 'Erreur lors de la duplication.')
        return
      }
      toast.success('Annonce dupliquée avec succès !')
      setDupModal(null)
      router.push(`/annonces/${json.id}/rubriques`)
    } catch {
      toast.error('Erreur lors de la duplication.')
    } finally {
      setDuplicating(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Filtres ── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher par thème ou prédicateur…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={anneeFilter} onValueChange={setAnneeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Année" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Toutes</SelectItem>
            {annees.map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statutFilter} onValueChange={setStatutFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="valide">Validé</SelectItem>
            <SelectItem value="publie">Publié</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Compteur ── */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} culte{filtered.length !== 1 ? 's' : ''}
        {(anneeFilter || statutFilter || search) && ' correspondant aux filtres'}
      </p>

      {/* ── Liste ── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-muted/30 p-10 text-center text-muted-foreground text-sm">
          Aucun culte trouvé.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(culte => {
            const annonce  = culte.annonces?.[0]
            const rubriques = annonce?.rubriques_annonce ?? []
            const completes = rubriques.filter(r => r.texte_final).length
            const pct       = rubriques.length > 0 ? Math.round((completes / rubriques.length) * 100) : 0

            return (
              <div
                key={culte.id}
                className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Infos culte */}
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{formatDate(culte.date_culte)}</span>
                    {statutBadge(annonce?.statut_global)}
                  </div>

                  {(culte.theme || culte.predicateur) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {[culte.theme, culte.predicateur].filter(Boolean).join(' · ')}
                    </p>
                  )}

                  {/* Barre de progression */}
                  {annonce && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="h-1.5 w-32 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            pct === 100 ? 'bg-emerald-500' : 'bg-primary',
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {completes}/{rubriques.length} rubriques
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {annonce ? (
                    <>
                      <Link href={`/annonces/${annonce.id}/apercu`}>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          Consulter
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          setNouvelleDate('')
                          setDupModal({ annonceId: annonce.id, theme: culte.theme ?? '' })
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Dupliquer
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Pas d&apos;annonce</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Dialog Dupliquer ── */}
      <Dialog open={dupModal !== null} onOpenChange={o => !o && setDupModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-4 w-4" /> Dupliquer l&apos;annonce
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {dupModal?.theme && (
              <p className="text-sm text-muted-foreground">
                Thème : <span className="text-foreground font-medium">{dupModal.theme}</span>
              </p>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> Date du nouveau culte
              </label>
              <Input
                type="date"
                value={nouvelleDate}
                min={today()}
                onChange={e => setNouvelleDate(e.target.value)}
              />
            </div>

            <div className="text-xs text-muted-foreground rounded-lg border bg-muted/40 p-3 space-y-1">
              <p>Les données du formulaire seront copiées.</p>
              <p>Les textes générés seront réinitialisés.</p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDupModal(null)} disabled={duplicating}>
                Annuler
              </Button>
              <Button
                onClick={handleDupliquer}
                disabled={!nouvelleDate || duplicating}
                className="gap-1.5"
              >
                {duplicating
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Duplication…</>
                  : <><Copy className="h-4 w-4" /> Dupliquer →</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
