import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { MaterielForm } from '@/components/sonorisation/materiel-form'
import { InventaireFilters } from '@/components/sonorisation/inventaire-filters'
import { InventaireTable } from '@/components/sonorisation/inventaire-table'
import { Badge } from '@/components/ui/badge'
import type { CategorieMateriel, MaterielSono, StatutMateriel } from '@/lib/supabase/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inventaire matériel | Sonorisation',
}

interface SearchParams {
  q?: string
  categorie?: CategorieMateriel
  statut?: StatutMateriel
}

interface Props {
  searchParams: Promise<SearchParams>
}

async function InventaireContent({ searchParams }: Props) {
  const { q, categorie, statut } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('materiel_sono')
    .select('*')
    .order('nom', { ascending: true })

  if (categorie) query = query.eq('categorie', categorie)
  if (statut)    query = query.eq('statut', statut)
  if (q) {
    query = query.or(
      `nom.ilike.%${q}%,marque.ilike.%${q}%,modele.ilike.%${q}%,reference.ilike.%${q}%`
    )
  }

  const { data: rawItems, error } = await query
  const items = (rawItems ?? []) as MaterielSono[]

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Erreur lors du chargement : {error.message}
      </div>
    )
  }

  // Compteurs par statut
  const stats = {
    total:          items.length,
    disponible:     items.filter(i => i.statut === 'disponible').length,
    emprunte:       items.filter(i => i.statut === 'emprunte').length,
    en_maintenance: items.filter(i => i.statut === 'en_maintenance').length,
    hors_service:   items.filter(i => i.statut === 'hors_service').length,
  }

  return (
    <>
      {/* Statistiques rapides */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{stats.total} articles au total</Badge>
        {stats.disponible     > 0 && <Badge variant="success">{stats.disponible} disponible{stats.disponible > 1 ? 's' : ''}</Badge>}
        {stats.emprunte       > 0 && <Badge variant="info">{stats.emprunte} emprunté{stats.emprunte > 1 ? 's' : ''}</Badge>}
        {stats.en_maintenance > 0 && <Badge variant="warning">{stats.en_maintenance} en maintenance</Badge>}
        {stats.hors_service   > 0 && <Badge variant="destructive">{stats.hors_service} hors service</Badge>}
      </div>

      {/* Tableau */}
      <div className="rounded-lg border bg-card">
        <InventaireTable items={items} />
      </div>
    </>
  )
}

export default function InventairePage({ searchParams }: Props) {
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventaire matériel</h1>
          <p className="text-muted-foreground text-sm">Sonorisation — gestion de l&apos;équipement</p>
        </div>
        <MaterielForm />
      </div>

      {/* Filtres */}
      <Suspense>
        <InventaireFilters />
      </Suspense>

      {/* Contenu */}
      <Suspense fallback={
        <div className="rounded-lg border bg-card animate-pulse h-64" />
      }>
        <InventaireContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
