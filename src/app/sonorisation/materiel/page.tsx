import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { MaterielForm } from '@/components/sonorisation/materiel-form'
import { MaterielFiltres } from '@/components/sonorisation/materiel-filtres'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { CATEGORIES, CATEGORIE_LABEL } from '@/lib/sonorisation/constants'
import {
  Package, ShieldCheck, Wrench, AlertTriangle, AlertCircle,
} from 'lucide-react'
import type { MaterielSono, EtatMateriel, CategorieMateriel } from '@/lib/supabase/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Matériel sonorisation',
}

// ── Helpers ────────────────────────────────────────────────────────────────

const ETAT_CONFIG: Record<EtatMateriel, { label: string; className: string }> = {
  neuf:     { label: 'Neuf',     className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  bon:      { label: 'Bon état', className: 'bg-green-100 text-green-800 border-green-200' },
  use:      { label: 'Usé',      className: 'bg-amber-100 text-amber-800 border-amber-200' },
  en_panne: { label: 'En panne', className: 'bg-red-100 text-red-800 border-red-200' },
}

function isNettoyageUrgent(date: string | null): boolean {
  if (!date) return false
  const diff = new Date(date).getTime() - Date.now()
  return diff <= 7 * 24 * 60 * 60 * 1000
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Stat cards ─────────────────────────────────────────────────────────────

interface Stats {
  total: number
  bon_etat: number
  en_reparation: number
  nettoyage_urgent: number
}

function StatCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Package className="h-4 w-4" />
            Total matériel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground mt-1">équipements référencés</p>
        </CardContent>
      </Card>

      <Card className="border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            En bon état
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-700">{stats.bon_etat}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.total > 0 ? Math.round((stats.bon_etat / stats.total) * 100) : 0}% du parc
          </p>
        </CardContent>
      </Card>

      <Card className={stats.en_reparation > 0 ? 'border-red-200' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-medium flex items-center gap-2 ${stats.en_reparation > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>
            <Wrench className="h-4 w-4" />
            En réparation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-3xl font-bold ${stats.en_reparation > 0 ? 'text-red-700' : ''}`}>
            {stats.en_reparation}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.en_reparation === 0 ? 'Aucune réparation en cours' : 'en attente de réparation'}
          </p>
        </CardContent>
      </Card>

      <Card className={stats.nettoyage_urgent > 0 ? 'border-amber-200' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-medium flex items-center gap-2 ${stats.nettoyage_urgent > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>
            <AlertTriangle className="h-4 w-4" />
            Nettoyage urgent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-3xl font-bold ${stats.nettoyage_urgent > 0 ? 'text-amber-700' : ''}`}>
            {stats.nettoyage_urgent}
          </p>
          <p className="text-xs text-muted-foreground mt-1">nettoyage dans ≤ 7 jours</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Tableau ────────────────────────────────────────────────────────────────

function MaterielTableau({ items }: { items: MaterielSono[] }) {
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
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40">
          <TableHead className="font-semibold">Nom</TableHead>
          <TableHead className="font-semibold">Catégorie</TableHead>
          <TableHead className="font-semibold text-center">Quantité</TableHead>
          <TableHead className="font-semibold">État</TableHead>
          <TableHead className="font-semibold">Dernier nettoyage</TableHead>
          <TableHead className="font-semibold">Prochain nettoyage</TableHead>
          <TableHead className="font-semibold text-center w-20">Alertes</TableHead>
          <TableHead className="font-semibold text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map(item => {
          const etatCfg = ETAT_CONFIG[item.etat]
          const urgentNettoyage = isNettoyageUrgent(item.prochain_nettoyage)

          return (
            <TableRow key={item.id} className="group">
              {/* Nom */}
              <TableCell>
                <div className="font-medium">{item.nom}</div>
                {(item.marque || item.modele) && (
                  <div className="text-xs text-muted-foreground">
                    {[item.marque, item.modele].filter(Boolean).join(' · ')}
                  </div>
                )}
              </TableCell>

              {/* Catégorie */}
              <TableCell className="text-sm text-muted-foreground">
                {CATEGORIE_LABEL[item.categorie]}
              </TableCell>

              {/* Quantité */}
              <TableCell className="text-center">
                <span className="font-semibold">{item.quantite_disponible}</span>
                <span className="text-muted-foreground text-xs">/{item.quantite_total}</span>
              </TableCell>

              {/* État */}
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-xs font-medium ${etatCfg.className}`}
                >
                  {etatCfg.label}
                </Badge>
              </TableCell>

              {/* Dernier nettoyage */}
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(item.dernier_nettoyage)}
              </TableCell>

              {/* Prochain nettoyage */}
              <TableCell>
                <span className={`text-sm ${urgentNettoyage ? 'font-semibold text-amber-600' : 'text-muted-foreground'}`}>
                  {formatDate(item.prochain_nettoyage)}
                </span>
              </TableCell>

              {/* Alertes */}
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  {item.en_reparation && (
                    <span title="En réparation">
                      <Wrench className="h-4 w-4 text-red-500" />
                    </span>
                  )}
                  {urgentNettoyage && (
                    <span title="Nettoyage urgent (≤ 7 jours)">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    </span>
                  )}
                  {!item.en_reparation && !urgentNettoyage && (
                    <span className="text-muted-foreground/40 text-xs">—</span>
                  )}
                </div>
              </TableCell>

              {/* Actions */}
              <TableCell className="text-right">
                <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  Modifier
                </span>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

// ── Page principale ────────────────────────────────────────────────────────

interface SearchParams { q?: string; categorie?: CategorieMateriel }
interface Props { searchParams: Promise<SearchParams> }

async function PageContent({ searchParams }: Props) {
  const { q, categorie } = await searchParams
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('materiel_sono')
    .select('*')
    .order('nom', { ascending: true })

  if (categorie) query = query.eq('categorie', categorie)
  if (q) query = query.ilike('nom', `%${q}%`)

  const { data: rawItems, error } = await query
  const items = (rawItems ?? []) as MaterielSono[]

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Erreur de chargement : {(error as { message: string }).message}
      </div>
    )
  }

  // Stats calculées sur la liste complète (sans filtre) si on a des filtres actifs
  // Pour les stats globales on re-fetch sans filtre
  const { data: allItems } = await (supabase as any)
    .from('materiel_sono')
    .select('etat, en_reparation, prochain_nettoyage')

  const allData = (allItems ?? []) as Pick<MaterielSono, 'etat' | 'en_reparation' | 'prochain_nettoyage'>[]

  const stats: Stats = {
    total:            allData.length,
    bon_etat:         allData.filter(i => i.etat === 'neuf' || i.etat === 'bon').length,
    en_reparation:    allData.filter(i => i.en_reparation).length,
    nettoyage_urgent: allData.filter(i => isNettoyageUrgent(i.prochain_nettoyage)).length,
  }

  return (
    <>
      <StatCards stats={stats} />

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {items.length} équipement{items.length > 1 ? 's' : ''}
            {(q || categorie) ? ' (filtré)' : ' au total'}
          </p>
        </div>
        <MaterielTableau items={items} />
      </div>
    </>
  )
}

export default function MaterielPage({ searchParams }: Props) {
  return (
    <div className="container mx-auto py-8 px-4 space-y-6 max-w-7xl">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matériel sonorisation</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Suivi de l&apos;inventaire, de l&apos;état et de la maintenance
          </p>
        </div>
        <MaterielForm />
      </div>

      {/* Filtres */}
      <Suspense>
        <MaterielFiltres />
      </Suspense>

      {/* Contenu */}
      <Suspense
        fallback={
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-muted" />
              ))}
            </div>
            <div className="h-64 rounded-xl bg-muted" />
          </div>
        }
      >
        <PageContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
