'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { CATEGORIE_LABEL, STATUT_CONFIG } from '@/lib/sonorisation/constants'
import { supprimerMateriel, modifierStatutMateriel } from '@/lib/sonorisation/actions'
import type { MaterielSono, StatutMateriel } from '@/lib/supabase/types'

interface Props {
  items: MaterielSono[]
}

export function InventaireTable({ items }: Props) {
  const [, startTransition] = useTransition()

  function handleDelete(id: number) {
    if (!confirm('Supprimer ce matériel ?')) return
    startTransition(async () => { await supprimerMateriel(id) })
  }

  function handleStatut(id: number, statut: StatutMateriel) {
    startTransition(async () => { await modifierStatutMateriel(id, statut) })
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
        <span className="text-4xl">📦</span>
        <p className="font-medium">Aucun matériel trouvé</p>
        <p className="text-sm">Ajoutez du matériel ou modifiez les filtres.</p>
      </div>
    )
  }

  const statutSelect = (id: number, statut: StatutMateriel) => (
    <select
      value={statut}
      onChange={e => handleStatut(id, e.target.value as StatutMateriel)}
      className="w-full text-xs rounded-md border border-input bg-background px-2 h-9 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
      aria-label="Changer le statut"
    >
      <option value="disponible">✅ Disponible</option>
      <option value="emprunte">🔵 Emprunté</option>
      <option value="en_maintenance">🟡 En maintenance</option>
      <option value="hors_service">🔴 Hors service</option>
    </select>
  )

  return (
    <>
      {/* ── Mobile : cartes empilées (< 640 px) ────────────────────────────── */}
      <div className="sm:hidden divide-y">
        {items.map(item => {
          const statutCfg = STATUT_CONFIG[item.statut]
          return (
            <div key={item.id} className="p-4 space-y-3">
              {/* Nom + badge statut */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm leading-snug">{item.nom}</p>
                  {item.reference && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.reference}</p>
                  )}
                </div>
                <Badge
                  variant={statutCfg.variant as Parameters<typeof Badge>[0]['variant']}
                  className="shrink-0 text-xs"
                >
                  {statutCfg.label}
                </Badge>
              </div>

              {/* Méta : catégorie, marque/modèle, localisation */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span>{CATEGORIE_LABEL[item.categorie]}</span>
                <span>
                  {[item.marque, item.modele].filter(Boolean).join(' ') || '—'}
                </span>
                {item.localisation && (
                  <span className="col-span-2 mt-0.5">{item.localisation}</span>
                )}
              </div>

              {/* Actions : changer statut + supprimer */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  {statutSelect(item.id, item.statut)}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(item.id)}
                  className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Desktop : tableau (≥ 640 px) ────────────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom / Référence</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Marque / Modèle</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => {
              const statutCfg = STATUT_CONFIG[item.statut]
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.nom}</div>
                    {item.reference && (
                      <div className="text-xs text-muted-foreground">{item.reference}</div>
                    )}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {CATEGORIE_LABEL[item.categorie]}
                  </TableCell>

                  <TableCell className="text-sm">
                    {item.marque && <span className="font-medium">{item.marque}</span>}
                    {item.marque && item.modele && ' '}
                    {item.modele && <span className="text-muted-foreground">{item.modele}</span>}
                    {!item.marque && !item.modele && <span className="text-muted-foreground">—</span>}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {item.localisation ?? '—'}
                  </TableCell>

                  <TableCell>
                    <select
                      value={item.statut}
                      onChange={e => handleStatut(item.id, e.target.value as StatutMateriel)}
                      className="text-xs rounded border-0 bg-transparent focus:ring-0 cursor-pointer p-0"
                      aria-label="Changer le statut"
                    >
                      <option value="disponible">✅ Disponible</option>
                      <option value="emprunte">🔵 Emprunté</option>
                      <option value="en_maintenance">🟡 En maintenance</option>
                      <option value="hors_service">🔴 Hors service</option>
                    </select>
                    <Badge
                      variant={statutCfg.variant as Parameters<typeof Badge>[0]['variant']}
                      className="pointer-events-none ml-1 hidden sm:inline-flex"
                    >
                      {statutCfg.label}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
