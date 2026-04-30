import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Package2, Users, CalendarDays,
  AlertTriangle, ChevronRight, Wrench, CheckCircle2,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tableau de bord' }

// ── Helpers ────────────────────────────────────────────────────────────────

function isNettoyageUrgent(date: string | null): boolean {
  if (!date) return false
  const diff = new Date(date).getTime() - Date.now()
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
}

function debutDeMois(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function finDeMois(): string {
  const d = new Date()
  const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`
}

function nomMois(): string {
  return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function formatDateCourte(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

// ── Données ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

async function getDashboardData() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const today = new Date().toISOString().slice(0, 10)

  const [materielRes, membresRes, planningRes, prochainsRes] = await Promise.all([
    supabase
      .from('materiel_sono')
      .select('id, en_reparation, prochain_nettoyage'),
    supabase
      .from('membres_son')
      .select('id, actif, role'),
    supabase
      .from('planning_son')
      .select('id, date_culte, statut, responsable_id, assistant1_id, assistant2_id')
      .gte('date_culte', debutDeMois())
      .lte('date_culte', finDeMois()),
    supabase
      .from('planning_son')
      .select('id, date_culte, statut')
      .gte('date_culte', today)
      .neq('statut', 'passe')
      .order('date_culte', { ascending: true })
      .limit(1),
  ])

  const materiel:  Row[] = materielRes.data  ?? []
  const membres:   Row[] = membresRes.data   ?? []
  const plannings: Row[] = planningRes.data  ?? []
  const prochains: Row[] = prochainsRes.data ?? []

  return {
    totalMateriel:    materiel.length,
    enReparation:     materiel.filter(m => m.en_reparation).length,
    nettoyageUrgent:  materiel.filter(m => isNettoyageUrgent(m.prochain_nettoyage)).length,
    membresActifs:    membres.filter(m => m.actif).length,
    membresTotal:     membres.length,
    nbResponsables:   membres.filter(m => m.role === 'responsable').length,
    nbTechniciens:    membres.filter(m => m.role === 'technicien').length,
    cultesPlannifies: plannings.filter(p => p.statut !== 'passe').length,
    cultesTotal:      plannings.length,
    prochainCulte:    prochains[0] ?? null,
    mois:             nomMois(),
  }
}

// ── Composant principal ────────────────────────────────────────────────────

async function PageContent() {
  const d = await getDashboardData()
  const alertes = d.enReparation + d.nettoyageUrgent

  return (
    <div className="space-y-6">

      {/* Alerte maintenance */}
      {alertes > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 leading-relaxed">
            <span className="font-semibold">Attention requise —</span>{' '}
            {d.enReparation > 0 && (
              <span>
                {d.enReparation} équipement{d.enReparation > 1 ? 's' : ''} en réparation
              </span>
            )}
            {d.enReparation > 0 && d.nettoyageUrgent > 0 && <span> · </span>}
            {d.nettoyageUrgent > 0 && (
              <span>
                {d.nettoyageUrgent} nettoyage{d.nettoyageUrgent > 1 ? 's' : ''} urgent{d.nettoyageUrgent > 1 ? 's' : ''}
              </span>
            )}
            {' '}— <Link href="/sonorisation/materiel" className="underline underline-offset-2 hover:text-amber-900">
              Voir le matériel
            </Link>
          </div>
        </div>
      )}

      {/* 3 cartes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* ── Matériel ── */}
        <Link href="/sonorisation/materiel" className="group">
          <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-blue-200 cursor-pointer">
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Matériel
              </CardTitle>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors shrink-0">
                <Package2 className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-4xl font-bold tabular-nums">{d.totalMateriel}</p>
                <p className="text-sm text-muted-foreground mt-1">équipements référencés</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {d.enReparation > 0 && (
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 gap-1">
                    <Wrench className="h-3 w-3" />
                    {d.enReparation} en réparation
                  </Badge>
                )}
                {d.nettoyageUrgent > 0 && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    {d.nettoyageUrgent} nettoyage{d.nettoyageUrgent > 1 ? 's' : ''} urgent{d.nettoyageUrgent > 1 ? 's' : ''}
                  </Badge>
                )}
                {d.enReparation === 0 && d.nettoyageUrgent === 0 && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Tout en ordre
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Voir le matériel <ChevronRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* ── Équipe ── */}
        <Link href="/sonorisation/equipe" className="group">
          <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-violet-200 cursor-pointer">
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Équipe
              </CardTitle>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-50 group-hover:bg-violet-100 transition-colors shrink-0">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-4xl font-bold tabular-nums">{d.membresActifs}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  membres actifs
                  {d.membresTotal > d.membresActifs && (
                    <span className="text-muted-foreground/60">
                      {' '}/ {d.membresTotal} au total
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {d.nbResponsables > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {d.nbResponsables} responsable{d.nbResponsables > 1 ? 's' : ''}
                  </Badge>
                )}
                {d.nbTechniciens > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {d.nbTechniciens} technicien{d.nbTechniciens > 1 ? 's' : ''}
                  </Badge>
                )}
                {d.membresActifs === 0 && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Aucun membre
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Voir l&apos;équipe <ChevronRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* ── Planning ── */}
        <Link href="/sonorisation/planning" className="group">
          <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-emerald-200 cursor-pointer">
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Planning
              </CardTitle>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 transition-colors shrink-0">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-4xl font-bold tabular-nums">{d.cultesPlannifies}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  culte{d.cultesPlannifies !== 1 ? 's' : ''} planifié{d.cultesPlannifies !== 1 ? 's' : ''}{' '}
                  en {d.mois}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {d.prochainCulte ? (
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                    <CalendarDays className="h-3 w-3" />
                    Prochain : {formatDateCourte(d.prochainCulte.date_culte)}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Aucun culte à venir
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Voir le planning <ChevronRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>

      </div>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-52 rounded-xl bg-muted" />
      ))}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SonorisationPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Vue d&apos;ensemble du département sonorisation
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <PageContent />
      </Suspense>
    </div>
  )
}
