'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, UserCheck, AlertTriangle } from 'lucide-react'
import { PLATEFORMES_BY_CODE, STATUTS_POST_BY_CODE } from '@/types/community'
import { upsertPlanningAction } from './actions'
import type { MembreCM, PlanningCM, Post, Plateforme, StatutPost } from '@/types/community'

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function formatSemaine(lundiStr: string): string {
  const lundi    = new Date(lundiStr + 'T00:00:00')
  const dimanche = new Date(lundiStr + 'T00:00:00')
  dimanche.setDate(lundi.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  const optsA: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  if (lundi.getMonth() === dimanche.getMonth()) {
    return `${lundi.getDate()} au ${dimanche.toLocaleDateString('fr-FR', optsA)}`
  }
  return `${lundi.toLocaleDateString('fr-FR', opts)} au ${dimanche.toLocaleDateString('fr-FR', optsA)}`
}

function formatDateCourte(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── PlanningClient ────────────────────────────────────────────────────────────

interface PlanningClientProps {
  semaine:   string
  planning:  PlanningCM | null
  membre:    MembreCM | null
  membres:   MembreCM[]
  posts:     Post[]
}

export default function PlanningClient({ semaine, planning, membre, membres, posts }: PlanningClientProps) {
  const router              = useRouter()
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState<string | null>(null)

  function navigate(direction: 'prev' | 'next') {
    const next = addDays(semaine, direction === 'next' ? 7 : -7)
    router.push(`/community/planning?semaine=${next}`)
  }

  async function handleAssign(membreId: string) {
    setSaving(true)
    setErr(null)
    try {
      const result = await upsertPlanningAction({
        semaine_debut: semaine,
        membre_id:     membreId === 'none' ? null : membreId,
        statut:        'confirme',
      })
      if (result.error) { setErr(result.error); return }
      startTransition(() => router.refresh())
    } catch (e) {
      setErr(String(e))
    } finally {
      setSaving(false)
    }
  }

  const totalPosts   = posts.length
  const publiesPosts = posts.filter(p => p.statut === 'publie').length
  const taux         = totalPosts > 0 ? Math.round((publiesPosts / totalPosts) * 100) : 0

  return (
    <div className="space-y-6">

      {/* ── Navigation semaine ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => navigate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Semaine</p>
          <p className="font-bold text-sm sm:text-base truncate">{formatSemaine(semaine)}</p>
        </div>
        <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => navigate('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ── CM Responsable ───────────────────────────────────────────────── */}
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">CM responsable</h3>
        </div>

        {membre ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
              {membre.prenom[0]}{membre.nom[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{membre.prenom} {membre.nom}</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {(membre.specialites ?? []).slice(0, 3).map((s: string) => (
                  <Badge key={s} variant="outline" className="text-[10px] h-4 px-1.5">{s}</Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Aucun CM assigné à cette semaine</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Select
            value={planning?.membre_id ?? 'none'}
            onValueChange={handleAssign}
            disabled={saving}
          >
            <SelectTrigger className="flex-1 h-9">
              <SelectValue placeholder="Assigner un CM…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Aucun CM —</SelectItem>
              {membres.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {m.prenom} {m.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {saving && <span className="text-xs text-muted-foreground">Enregistrement…</span>}
        </div>

        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>

      {/* ── Stats semaine ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-3 text-center">
          <p className="text-2xl font-bold tabular-nums">{totalPosts}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Posts prévus</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-green-700">{publiesPosts}</p>
          <p className="text-xs text-green-600/80 mt-0.5">Publiés</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-blue-700">{taux}%</p>
          <p className="text-xs text-blue-600/80 mt-0.5">Taux pub.</p>
        </div>
      </div>

      {/* ── Liste des posts ──────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Posts de la semaine ({posts.length})
        </h3>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun post planifié pour cette semaine.
          </p>
        ) : (
          <div className="space-y-2">
            {posts.map(post => {
              const plate  = PLATEFORMES_BY_CODE[post.plateforme as Plateforme]
              const statut = STATUTS_POST_BY_CODE[post.statut as StatutPost]
              return (
                <div key={post.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 text-lg leading-none"
                    style={{ background: plate?.couleurBg ?? '#f5f5f5' }}
                  >
                    {plate?.icone ?? '📄'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {post.titre ?? post.type_contenu ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateCourte(post.date_publication_prevue)}
                    </p>
                  </div>
                  {statut && (
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                      style={{ color: statut.couleur, background: statut.couleur + '15' }}
                    >
                      {statut.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
