import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { MediathequeClient } from '@/components/captation/MediathequeClient'
import type { DossierDrive } from '@/types/captation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Médiathèque' }

// ── Types ──────────────────────────────────────────────────────────────────

export interface CulteAvecDossier {
  id:         string
  date_culte: string
  theme:      string | null
  dossier:    DossierDrive | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

function bornesMois(annee: number, mois: number): { debut: string; fin: string } {
  const derJour = new Date(annee, mois, 0).getDate()
  const pad     = (n: number) => String(n).padStart(2, '0')
  return {
    debut: `${annee}-${pad(mois)}-01`,
    fin:   `${annee}-${pad(mois)}-${pad(derJour)}`,
  }
}

// ── Données ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

async function PageContent({ annee, mois }: { annee: number; mois: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { debut, fin } = bornesMois(annee, mois)

  const cultesRes = await supabase
    .from('cultes')
    .select('id, date_culte, theme')
    .gte('date_culte', debut)
    .lte('date_culte', fin)
    .order('date_culte', { ascending: false })

  let dossiers: DossierDrive[] = []
  if (cultesRes.data && (cultesRes.data as Row[]).length > 0) {
    const culteIds = (cultesRes.data as Row[]).map((c: Row) => c.id as string)
    const { data: dossiersData } = await supabase
      .from('dossiers_drive')
      .select('*')
      .in('culte_id', culteIds)
    dossiers = (dossiersData ?? []) as DossierDrive[]
  }

  if (cultesRes.error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Erreur : {(cultesRes.error as { message: string }).message}
      </div>
    )
  }

  const dossierByCulte = Object.fromEntries(
    dossiers.map(d => [d.culte_id, d])
  ) as Record<string, DossierDrive>

  const cultes: CulteAvecDossier[] = ((cultesRes.data ?? []) as Row[]).map((c: Row) => ({
    id:         c.id         as string,
    date_culte: c.date_culte as string,
    theme:      c.theme      as string | null,
    dossier:    dossierByCulte[c.id] ?? null,
  }))

  // Stats globales du mois
  const nbCrees     = cultes.filter(c => c.dossier !== null).length
  const espaceTotal = dossiers.reduce((acc, d) => acc + (d.espace_utilise_mb ?? 0), 0)

  return (
    <MediathequeClient
      cultes={cultes}
      annee={annee}
      mois={mois}
      stats={{ nbCrees, nbTotal: cultes.length, espaceTotal }}
    />
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-20 rounded-xl bg-muted" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function MediathequePage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string }>
}) {
  const params = await searchParams
  const now    = new Date()
  const annee  = parseInt(params.annee ?? '') || now.getFullYear()
  const mois   = parseInt(params.mois  ?? '') || now.getMonth() + 1

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Médiathèque</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Dossiers Google Drive par culte
        </p>
      </div>

      <Suspense key={`${annee}-${mois}`} fallback={<Skeleton />}>
        <PageContent annee={annee} mois={mois} />
      </Suspense>
    </div>
  )
}
