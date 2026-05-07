'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronRight, Send, CheckCircle2, FileText,
  MoreVertical, Pencil, Trash2, Loader2, PlusCircle,
} from 'lucide-react'
import { modifierCulte, supprimerCulte } from '@/app/annonces/culte-actions'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────────────────

interface CulteMinimal {
  id:          number
  date_culte:  string
  theme:       string | null
  predicateur: string | null
  annonces?: Array<{
    id: string
    statut_global: 'brouillon' | 'valide' | 'publie'
    rubriques_annonce?: Array<{ valide: boolean }>
  }>
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateLongue(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

type StatutAnnonce = 'aucune' | 'brouillon' | 'valide' | 'publie'

function getStatut(culte: CulteMinimal): StatutAnnonce {
  const annonce = culte.annonces?.[0]
  if (!annonce) return 'aucune'
  return annonce.statut_global
}

function getRubriques(culte: CulteMinimal): { completes: number; total: number } {
  const annonce = culte.annonces?.[0]
  if (!annonce) return { completes: 0, total: 7 }
  return {
    completes: (annonce.rubriques_annonce ?? []).filter(r => r.valide).length,
    total:     7,
  }
}

function BadgeStatut({ statut }: { statut: StatutAnnonce }) {
  switch (statut) {
    case 'publie':
      return (
        <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 gap-1 text-xs">
          <Send className="h-3 w-3" /> Publié
        </Badge>
      )
    case 'valide':
      return (
        <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 gap-1 text-xs">
          <CheckCircle2 className="h-3 w-3" /> Validé
        </Badge>
      )
    case 'brouillon':
      return (
        <Badge variant="outline" className="text-xs gap-1">
          <FileText className="h-3 w-3" /> Brouillon
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Sans annonce
        </Badge>
      )
  }
}

// ── Dialog : Modifier culte ────────────────────────────────────────────────

function DialogModifier({
  culte,
  open,
  onClose,
}: {
  culte: CulteMinimal
  open: boolean
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await modifierCulte({
        id:          culte.id,
        date_culte:  fd.get('date_culte') as string,
        theme:       (fd.get('theme') as string) || null,
        predicateur: (fd.get('predicateur') as string) || null,
      })
      if (result.error) {
        toast.error('Erreur : ' + result.error)
      } else {
        toast.success('Culte modifié')
        onClose()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le culte</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="date_culte">Date du culte *</Label>
            <Input
              id="date_culte"
              name="date_culte"
              type="date"
              required
              defaultValue={culte.date_culte}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="theme">Thème</Label>
            <Input
              id="theme"
              name="theme"
              placeholder="Ex. : La grâce de Dieu"
              defaultValue={culte.theme ?? ''}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="predicateur">Prédicateur</Label>
            <Input
              id="predicateur"
              name="predicateur"
              placeholder="Ex. : Pasteur Martin"
              defaultValue={culte.predicateur ?? ''}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Dialog : Supprimer culte ───────────────────────────────────────────────

function DialogSupprimer({
  culte,
  open,
  onClose,
}: {
  culte: CulteMinimal
  open: boolean
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await supprimerCulte(culte.id)
      if (result.error) {
        toast.error('Erreur : ' + result.error)
      } else {
        toast.success('Culte supprimé')
        onClose()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Supprimer ce culte ?
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-2">
          <p className="text-sm text-muted-foreground">
            Vous êtes sur le point de supprimer le culte du{' '}
            <span className="font-semibold text-foreground">
              {capitalize(formatDateLongue(culte.date_culte))}
            </span>.
          </p>
          {culte.annonces && culte.annonces.length > 0 && (
            <p className="text-sm text-destructive font-medium">
              ⚠️ L&apos;annonce et toutes ses rubriques seront également supprimées.
            </p>
          )}
          <p className="text-xs text-muted-foreground">Cette action est irréversible.</p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Supprimer définitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Carte culte interactive ────────────────────────────────────────────────

export function CarteCulteInteractive({ culte }: { culte: CulteMinimal }) {
  const [showEdit,   setShowEdit]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const statut = getStatut(culte)
  const { completes, total } = getRubriques(culte)
  const progression = completes / total

  const btnLabel = statut === 'aucune' ? 'Commencer' : statut === 'brouillon' ? 'Reprendre' : 'Consulter'
  const href = statut === 'aucune'
    ? `/annonces/nouveau?culte=${culte.id}`
    : statut === 'brouillon'
    ? `/annonces/${culte.annonces?.[0]?.id ?? ''}/rubriques`
    : `/annonces/historique/${culte.annonces?.[0]?.id ?? ''}`

  const addAnnonceHref = `/annonces/nouveau?culte=${culte.id}`

  return (
    <>
      <Card className="transition-all duration-200 hover:shadow-md hover:border-primary/20 group">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">

            {/* Infos culte */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm font-semibold leading-tight truncate">
                {capitalize(formatDateLongue(culte.date_culte))}
              </p>
              {culte.theme && (
                <p className="text-xs text-muted-foreground truncate">{culte.theme}</p>
              )}
              {culte.predicateur && (
                <p className="text-xs text-muted-foreground truncate">🎤 {culte.predicateur}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <BadgeStatut statut={statut} />
                {statut !== 'aucune' && (
                  <span className="text-xs text-muted-foreground">
                    {completes}/{total} rubriques
                  </span>
                )}
              </div>
              {statut !== 'aucune' && (
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.round(progression * 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Bouton principal */}
              <Link href={href}>
                <Button
                  variant={statut === 'aucune' || statut === 'brouillon' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs h-8"
                >
                  {btnLabel}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>

              {/* Menu contextuel */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-48">
                  {/* Modifier infos du culte */}
                  <DropdownMenuItem onClick={() => setShowEdit(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    Modifier le culte
                  </DropdownMenuItem>

                  {/* Ajouter une annonce si pas encore créée */}
                  {statut === 'aucune' && (
                    <DropdownMenuItem asChild>
                      <Link href={addAnnonceHref} className="flex items-center">
                        <PlusCircle className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        Créer une annonce
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {/* Accéder aux rubriques si brouillon */}
                  {statut === 'brouillon' && (
                    <DropdownMenuItem asChild>
                      <Link href={`/annonces/${culte.annonces?.[0]?.id}/rubriques`} className="flex items-center">
                        <FileText className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        Voir les rubriques
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  {/* Supprimer */}
                  <DropdownMenuItem
                    onClick={() => setShowDelete(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DialogModifier
        culte={culte}
        open={showEdit}
        onClose={() => setShowEdit(false)}
      />
      <DialogSupprimer
        culte={culte}
        open={showDelete}
        onClose={() => setShowDelete(false)}
      />
    </>
  )
}
