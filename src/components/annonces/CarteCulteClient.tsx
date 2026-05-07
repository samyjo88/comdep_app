'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ChevronRight, CheckCircle2, Send, FileText, Trash2, Loader2,
} from 'lucide-react'
import { supprimerCulteAction } from '@/app/annonces/actions'
import type { CulteAvecAnnonce } from '@/lib/annonces'

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDateLongue(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function rubriquesCompletes(culte: CulteAvecAnnonce) {
  const annonce = culte.annonces?.[0]
  if (!annonce) return { completes: 0, total: 7 }
  return { completes: (annonce.rubriques_annonce ?? []).filter(r => r.valide).length, total: 7 }
}

function statutAnnonce(culte: CulteAvecAnnonce): 'aucune' | 'brouillon' | 'valide' | 'publie' {
  const annonce = culte.annonces?.[0]
  if (!annonce) return 'aucune'
  return annonce.statut_global
}

// ── Badge statut ─────────────────────────────────────────────────────────────

function BadgeStatut({ statut }: { statut: ReturnType<typeof statutAnnonce> }) {
  switch (statut) {
    case 'publie':
      return (
        <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 gap-1 text-xs">
          <Send className="h-3 w-3" /> Publié
        </Badge>
      )
    case 'valide':
      return (
        <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 gap-1 text-xs">
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

// ── Composant principal ───────────────────────────────────────────────────────

export function CarteCulteClient({ culte }: { culte: CulteAvecAnnonce }) {
  const statut = statutAnnonce(culte)
  const { completes, total } = rubriquesCompletes(culte)
  const progression = completes / total

  const btnLabel = statut === 'aucune' ? 'Commencer' : statut === 'brouillon' ? 'Reprendre' : 'Consulter'
  const href = statut === 'aucune'
    ? `/annonces/nouveau?culte=${culte.id}`
    : statut === 'brouillon'
    ? `/annonces/${culte.annonces?.[0]?.id ?? ''}/rubriques`
    : `/annonces/historique/${culte.annonces?.[0]?.id ?? ''}`

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSupprimer() {
    startTransition(async () => {
      const result = await supprimerCulteAction(culte.id)
      if (!result.success) {
        toast.error(`Erreur : ${result.error}`)
      } else {
        toast.success('Culte supprimé')
      }
      setDialogOpen(false)
    })
  }

  return (
    <>
      <Card className="transition-all duration-200 hover:shadow-md hover:border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">

            {/* Infos */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm font-semibold leading-tight truncate">
                {capitalize(formatDateLongue(culte.date_culte))}
              </p>
              {culte.theme && (
                <p className="text-xs text-muted-foreground truncate">{culte.theme}</p>
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
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Supprimer ce culte"
                disabled={isPending}
                onClick={() => setDialogOpen(true)}
              >
                {isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Trash2 className="h-3.5 w-3.5" />
                }
              </Button>

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
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmation */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer ce culte ?</DialogTitle>
            <DialogDescription>
              Le culte du{' '}
              <strong>{capitalize(formatDateLongue(culte.date_culte))}</strong>{' '}
              et toutes ses annonces associées seront définitivement supprimés.
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleSupprimer}
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
