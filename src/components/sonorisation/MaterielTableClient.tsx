'use client'

import { useState } from 'react'
import { Pencil, Wrench, AlertCircle, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { MaterielModal } from '@/components/sonorisation/MaterielModal'
import { CATEGORIE_LABEL, STATUT_CONFIG } from '@/lib/sonorisation/constants'
import type { MaterielSono, EtatMateriel } from '@/lib/supabase/types'

const ETAT_CONFIG: Record<EtatMateriel, { label: string; className: string }> = {
  neuf:     { label: 'Neuf',     className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  bon:      { label: 'Bon état', className: 'bg-green-100 text-green-800 border-green-200' },
  use:      { label: 'Usé',      className: 'bg-amber-100 text-amber-800 border-amber-200' },
  en_panne: { label: 'En panne', className: 'bg-red-100 text-red-800 border-red-200' },
}

function isNettoyageUrgent(date: string | null): boolean {
  if (!date) return false
  return new Date(date).getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface Props {
  items: MaterielSono[]
}

export function MaterielTableClient({ items }: Props) {
  const [editMateriel, setEditMateriel] = useState<MaterielSono | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  function openEdit(item: MaterielSono) {
    setEditMateriel(item)
    setModalOpen(true)
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <span className="text-5xl">🎛️</span>
        <p className="font-semibold text-lg">Aucun équipement trouvé</p>
        <p className="text-sm text-muted-foreground">Ajoutez du matériel ou modifiez les filtres.</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile : cartes empilées */}
      <div className="md:hidden divide-y">
        {items.map(item => {
          const etatCfg = ETAT_CONFIG[item.etat]
          const statutCfg = STATUT_CONFIG[item.statut]
          const urgentNettoyage = isNettoyageUrgent(item.prochain_nettoyage)

          return (
            <div key={item.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">{item.nom}</p>
                  {(item.marque || item.modele) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[item.marque, item.modele].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-xs font-medium ${etatCfg.className}`}>
                    {etatCfg.label}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}
                    aria-label="Modifier">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground border-t pt-2">
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  <span className="font-semibold text-foreground">{item.quantite_disponible}</span>
                  <span>/{item.quantite_total}</span>
                </span>
                <span>{CATEGORIE_LABEL[item.categorie]}</span>
                <Badge
                  variant={statutCfg.variant as Parameters<typeof Badge>[0]['variant']}
                  className="text-xs"
                >
                  {statutCfg.label}
                </Badge>
              </div>

              {(item.en_reparation || urgentNettoyage) && (
                <div className="flex flex-wrap gap-2">
                  {item.en_reparation && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                      <Wrench className="h-3 w-3" /> En réparation
                    </span>
                  )}
                  {urgentNettoyage && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      <AlertCircle className="h-3 w-3" /> Nettoyage urgent
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop : tableau */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold">Nom</TableHead>
              <TableHead className="font-semibold">Catégorie</TableHead>
              <TableHead className="font-semibold text-center">Quantité</TableHead>
              <TableHead className="font-semibold">État</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="font-semibold">Dernier nettoyage</TableHead>
              <TableHead className="font-semibold">Prochain nettoyage</TableHead>
              <TableHead className="font-semibold text-center w-20">Alertes</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => {
              const etatCfg = ETAT_CONFIG[item.etat]
              const statutCfg = STATUT_CONFIG[item.statut]
              const urgentNettoyage = isNettoyageUrgent(item.prochain_nettoyage)

              return (
                <TableRow key={item.id} className="group">
                  <TableCell>
                    <div className="font-medium">{item.nom}</div>
                    {(item.marque || item.modele) && (
                      <div className="text-xs text-muted-foreground">
                        {[item.marque, item.modele].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {CATEGORIE_LABEL[item.categorie]}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold">{item.quantite_disponible}</span>
                    <span className="text-muted-foreground text-xs">/{item.quantite_total}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs font-medium ${etatCfg.className}`}>
                      {etatCfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statutCfg.variant as Parameters<typeof Badge>[0]['variant']}
                      className="text-xs"
                    >
                      {statutCfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(item.dernier_nettoyage)}
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm ${urgentNettoyage ? 'font-semibold text-amber-600' : 'text-muted-foreground'}`}>
                      {formatDate(item.prochain_nettoyage)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {item.en_reparation && (
                        <span title="En réparation"><Wrench className="h-4 w-4 text-red-500" /></span>
                      )}
                      {urgentNettoyage && (
                        <span title="Nettoyage urgent (≤ 7 jours)"><AlertCircle className="h-4 w-4 text-amber-500" /></span>
                      )}
                      {!item.en_reparation && !urgentNettoyage && (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => openEdit(item)}
                      aria-label="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <MaterielModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        materiel={editMateriel}
      />
    </>
  )
}
