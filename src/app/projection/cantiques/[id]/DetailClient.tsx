'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  ArrowLeft, Pencil, ListPlus, Copy, Check, ChevronDown, ChevronUp,
  FileText, Volume2, Music, CalendarDays, BarChart3, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CantiqueModal } from '@/components/projection/CantiqueModal'
import type { Cantique } from '../CantiquesClient'
import type { SetlistRef } from './page'

// ── Constants ──────────────────────────────────────────────────────────────

const MOMENTS_LABEL: Record<string, string> = {
  adoration:  'Adoration',
  louange:    'Louange',
  offertoire: 'Offertoire',
  communion:  'Communion',
  envoi:      'Envoi',
  special:    'Spécial',
}

const OCCASIONS_LABEL: Record<string, string> = {
  culte_ordinaire: 'Culte ordinaire',
  communion:       'Communion',
  bapteme:         'Baptême',
  mariage:         'Mariage',
  noel:            'Noël',
  paques:          'Pâques',
}

const TEMPOS_LABEL: Record<string, string> = {
  lent:      'Lent',
  moderato:  'Modéré',
  vif:       'Vif',
}

const DIFFICULTES_LABEL: Record<string, string> = {
  facile:    'Facile',
  moyen:     'Moyen',
  difficile: 'Difficile',
}

const STATUT_LABEL: Record<string, string> = {
  brouillon: 'Brouillon',
  valide:    'Validée',
  utilise:   'Utilisée',
}

const PAROLES_COLLAPSE_LINES = 14

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function isDirectAudio(url: string): boolean {
  return /\.(mp3|ogg|wav|m4a|flac|aac)(\?.*)?$/i.test(url)
}

// ── Paroles parser ─────────────────────────────────────────────────────────

type ParoleLine =
  | { type: 'section'; text: string }
  | { type: 'lyric';   text: string }
  | { type: 'empty' }

function parseParoles(text: string): ParoleLine[] {
  return text.split('\n').map(line => {
    const t = line.trim()
    if (!t) return { type: 'empty' as const }
    if (/^(refrain|couplet\s*\d*|verset\s*\d*|pont|bridge|intro|outro|interlude|pré[\s-]refrain|pre[\s-]refrain|verse\s*\d*|chorus)\s*:?/i.test(t)) {
      return { type: 'section' as const, text: t }
    }
    return { type: 'lyric' as const, text: t }
  })
}

function renderParoleLine(line: ParoleLine, i: number) {
  if (line.type === 'empty') return <div key={i} className="h-3" />
  if (line.type === 'section') {
    return (
      <p key={i} className="mt-2 mb-1 text-sm font-bold uppercase tracking-wide text-primary/80">
        {line.text}
      </p>
    )
  }
  return (
    <p key={i} className="text-sm leading-relaxed">
      {line.text}
    </p>
  )
}

// ── ParolesSection ─────────────────────────────────────────────────────────

function ParolesSection({ paroles }: { paroles: string }) {
  const [expanded, setExpanded] = useState(false)
  const [copied,   setCopied]   = useState(false)

  const lines  = parseParoles(paroles)
  const isLong = lines.length > PAROLES_COLLAPSE_LINES
  const shown  = isLong && !expanded ? lines.slice(0, PAROLES_COLLAPSE_LINES) : lines

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(paroles)
      setCopied(true)
      toast.success('Paroles copiées')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Music className="h-4 w-4 text-muted-foreground" />
          Paroles
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copié !' : 'Copier'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className={cn('relative', isLong && !expanded && 'overflow-hidden')}>
          <div className="space-y-0.5">
            {shown.map((line, i) => renderParoleLine(line, i))}
          </div>

          {isLong && !expanded && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none" />
          )}
        </div>

        {isLong && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Réduire
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Afficher tout ({lines.length} lignes)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ── RessourcesSection ──────────────────────────────────────────────────────

function RessourcesSection({
  lienPartition,
  lienAudio,
}: {
  lienPartition: string | null
  lienAudio:     string | null
}) {
  if (!lienPartition && !lienAudio) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Liens &amp; ressources
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lienPartition && (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-emerald-50 shrink-0">
              <FileText className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Partition</p>
              <a
                href={lienPartition}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1 truncate"
              >
                Ouvrir la partition
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          </div>
        )}

        {lienAudio && (
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-50 shrink-0 mt-0.5">
              <Volume2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Audio de référence</p>
              {isDirectAudio(lienAudio) ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <audio
                  controls
                  src={lienAudio}
                  className="w-full h-9 rounded-lg"
                  style={{ accentColor: 'hsl(var(--primary))' }}
                />
              ) : (
                <a
                  href={lienAudio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                >
                  Écouter
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── StatsSection ───────────────────────────────────────────────────────────

function StatsSection({
  cantique,
  setlists,
}: {
  cantique: Cantique
  setlists: SetlistRef[]
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Statistiques d&apos;utilisation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compteurs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted/50 px-4 py-3 text-center">
            <p className="text-3xl font-black tabular-nums">{cantique.nb_utilisations}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              utilisation{cantique.nb_utilisations !== 1 ? 's' : ''} au total
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 px-4 py-3 text-center">
            <p className="text-sm font-semibold">
              {(cantique as unknown as { derniere_utilisation?: string | null }).derniere_utilisation
                ? formatDate((cantique as unknown as { derniere_utilisation: string }).derniere_utilisation)
                : '—'
              }
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">dernière utilisation</p>
          </div>
        </div>

        {/* Dernières setlists */}
        {setlists.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              5 dernières setlists
            </p>
            <div className="space-y-1.5">
              {setlists.map(s => (
                <Link
                  key={s.id}
                  href={`/projection/setlists/${s.id}`}
                  className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 hover:bg-muted/40 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {s.titre_setlist ?? (s.date_culte
                        ? `Culte du ${capitalize(formatDate(s.date_culte))}`
                        : 'Setlist sans titre'
                      )}
                    </p>
                    {s.date_culte && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(s.date_culte)}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 py-0 h-4 shrink-0 ml-2',
                      s.statut === 'valide' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      s.statut === 'utilise' && 'bg-blue-50 text-blue-700 border-blue-200',
                    )}
                  >
                    {STATUT_LABEL[s.statut] ?? s.statut}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {setlists.length === 0 && cantique.nb_utilisations === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Ce cantique n&apos;a pas encore été utilisé dans une setlist.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ── DetailClient ───────────────────────────────────────────────────────────

export function DetailClient({
  cantique,
  setlists,
}: {
  cantique: Cantique
  setlists: SetlistRef[]
}) {
  const router               = useRouter()
  const [editOpen, setEditOpen] = useState(false)

  const isGad = cantique.categorie === 'gad'

  return (
    <div className="space-y-6">

      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Navigation */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Link href="/projection/cantiques">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs -ml-1 h-8">
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour aux cantiques
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/projection/setlists?cantique=${cantique.id}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <ListPlus className="h-3.5 w-3.5" />
                Ajouter à une setlist
              </Button>
            </Link>
            <Button
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </Button>
          </div>
        </div>

        {/* Titre & identité */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {isGad ? (
              <>
                <Badge
                  variant="outline"
                  className="bg-blue-100 text-blue-700 border-blue-200 font-bold text-xs px-2"
                >
                  GAD
                </Badge>
                {cantique.numero_gad && (
                  <span className="text-3xl font-black tabular-nums text-blue-700 leading-none">
                    {cantique.numero_gad}
                  </span>
                )}
              </>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-100 text-amber-700 border-amber-200 font-bold text-xs px-2"
              >
                CHORALE
              </Badge>
            )}
            {!cantique.actif && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Inactif
              </Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold tracking-tight">{cantique.titre}</h1>
          {cantique.sous_titre && (
            <p className="text-lg text-muted-foreground italic">{cantique.sous_titre}</p>
          )}
          {cantique.auteur_compositeur && (
            <p className="text-sm text-muted-foreground">{cantique.auteur_compositeur}</p>
          )}
        </div>

        {/* Badges info */}
        <div className="flex flex-wrap gap-2">
          {cantique.tonalite && (
            <Badge variant="outline" className="text-xs px-2">
              {cantique.tonalite}
            </Badge>
          )}
          {cantique.tempo && (
            <Badge variant="outline" className="text-xs px-2">
              {TEMPOS_LABEL[cantique.tempo] ?? cantique.tempo}
            </Badge>
          )}
          {cantique.difficulte && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs px-2',
                cantique.difficulte === 'facile'    && 'bg-green-50 text-green-700 border-green-200',
                cantique.difficulte === 'moyen'     && 'bg-amber-50 text-amber-700 border-amber-200',
                cantique.difficulte === 'difficile' && 'bg-red-50 text-red-700 border-red-200',
              )}
            >
              {DIFFICULTES_LABEL[cantique.difficulte] ?? cantique.difficulte}
            </Badge>
          )}
          {(cantique.moment_culte ?? []).map(m => (
            <Badge key={m} variant="outline" className={cn(
              'text-xs px-2',
              isGad
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-amber-50 text-amber-600 border-amber-200',
            )}>
              {MOMENTS_LABEL[m] ?? m}
            </Badge>
          ))}
          {(cantique.occasion ?? []).map(o => (
            <Badge key={o} variant="outline" className="text-xs px-2">
              {OCCASIONS_LABEL[o] ?? o}
            </Badge>
          ))}
          {(cantique.themes ?? []).map(t => (
            <Badge key={t} variant="secondary" className="text-xs px-2 capitalize">
              {t}
            </Badge>
          ))}
        </div>
      </div>

      {/* ── Paroles ──────────────────────────────────────────────────── */}
      {cantique.paroles ? (
        <ParolesSection paroles={cantique.paroles} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Music className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Paroles non renseignées.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-xs gap-1.5"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Ajouter les paroles
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Ressources ───────────────────────────────────────────────── */}
      <RessourcesSection
        lienPartition={cantique.lien_partition}
        lienAudio={cantique.lien_audio}
      />

      {/* ── Statistiques ─────────────────────────────────────────────── */}
      <StatsSection cantique={cantique} setlists={setlists} />

      {/* ── Notes ────────────────────────────────────────────────────── */}
      {cantique.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Notes internes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{cantique.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Modal édition ─────────────────────────────────────────────── */}
      <CantiqueModal
        open={editOpen}
        onOpenChange={setEditOpen}
        cantique={cantique}
        onSuccess={() => {
          setEditOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
