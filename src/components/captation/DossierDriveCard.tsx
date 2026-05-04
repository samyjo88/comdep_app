'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Cloud, CloudOff, ExternalLink, FolderOpen,
  Camera, ImageIcon, Palette, Loader2, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DossierDrive } from '@/types/captation'

// ── Types ──────────────────────────────────────────────────────────────────

export interface DossierDriveCardProps {
  culteId:  string
  dossier:  DossierDrive | null
  onUpdate: (dossier: DossierDrive) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatMb(mb: number | null): string {
  if (mb === null) return '—'
  if (mb < 1)     return `${Math.round(mb * 1024)} Ko`
  if (mb < 1024)  return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return 'jamais'
  const diff = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diff < 1)    return "à l'instant"
  if (diff < 60)   return `il y a ${diff} min`
  if (diff < 1440) return `il y a ${Math.round(diff / 60)} h`
  return `il y a ${Math.round(diff / 1440)} j`
}

// ── Lien Drive ─────────────────────────────────────────────────────────────

function LienDrive({ href, label }: { href: string | null; label: string }) {
  if (!href) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-xs text-primary hover:underline underline-offset-2 transition-colors"
    >
      {label}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  )
}

// ── État vide ──────────────────────────────────────────────────────────────

function EtatVide({ culteId, onCreated }: { culteId: string; onCreated: (d: DossierDrive) => void }) {
  const [pending, setPending] = useState(false)

  async function creer() {
    setPending(true)
    try {
      const res  = await fetch('/api/captation/drive/creer-dossier', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ culte_id: culteId }),
      })
      const json = await res.json() as { dossier?: DossierDrive; error?: string }
      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Erreur lors de la création du dossier')
      } else if (json.dossier) {
        toast.success('Dossier Drive créé avec succès')
        onCreated(json.dossier)
      }
    } catch {
      toast.error('Impossible de contacter le serveur')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
        <CloudOff className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Aucun dossier Drive pour ce culte</p>
      </div>
      <Button size="sm" onClick={creer} disabled={pending} className="gap-2">
        {pending
          ? <><Loader2 className="h-4 w-4 animate-spin" />Création du dossier…</>
          : <><Cloud className="h-4 w-4" />Créer le dossier Drive</>
        }
      </Button>
    </div>
  )
}

// ── État rempli ────────────────────────────────────────────────────────────

function EtatRempli({
  culteId, dossier, onSynced,
}: {
  culteId:  string
  dossier:  DossierDrive
  onSynced: (d: DossierDrive) => void
}) {
  const [pending, setPending] = useState(false)

  async function synchroniser() {
    if (pending) return
    setPending(true)
    try {
      const res  = await fetch('/api/captation/drive/synchroniser', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ culte_id: culteId }),
      })
      const json = await res.json() as { dossier?: DossierDrive; error?: string }
      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Erreur lors de la synchronisation')
      } else if (json.dossier) {
        toast.success('Stats Drive synchronisées')
        onSynced(json.dossier)
      }
    } catch {
      toast.error('Impossible de contacter le serveur')
    } finally {
      setPending(false)
    }
  }

  const sous_dossiers = [
    { icone: Camera,    label: 'Vidéos',      lien: dossier.lien_videos      },
    { icone: ImageIcon, label: 'Photos',      lien: dossier.lien_photos      },
    { icone: Palette,   label: 'Infographie', lien: dossier.lien_infographie },
  ]

  return (
    <div className="space-y-3">
      {/* Dossier principal */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
        <FolderOpen className="h-5 w-5 text-amber-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">Dossier principal</p>
        </div>
        <LienDrive href={dossier.lien_dossier_principal} label="Ouvrir" />
      </div>

      {/* Sous-dossiers */}
      <div className="pl-4 space-y-1.5 border-l-2 border-muted ml-3">
        {sous_dossiers.map(({ icone: Icon, label, lien }) => (
          <div key={label} className="flex items-center gap-2.5 py-1 px-2 rounded hover:bg-muted/40 transition-colors">
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground flex-1">{label}</span>
            <LienDrive href={lien} label="Ouvrir" />
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2 rounded-lg text-xs text-muted-foreground',
        'bg-muted/30 border border-dashed',
      )}>
        <span>
          📊 {formatMb(dossier.espace_utilise_mb)} utilisés
          {dossier.nb_fichiers !== null && ` · ${dossier.nb_fichiers} fichier${dossier.nb_fichiers > 1 ? 's' : ''}`}
        </span>
        <span>Synchro : {formatRelative(dossier.derniere_synchro)}</span>
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────

export function DossierDriveCard({ culteId, dossier: initial, onUpdate }: DossierDriveCardProps) {
  const [dossier, setDossier] = useState<DossierDrive | null>(initial)
  const [syncPending, setSyncPending] = useState(false)

  function handleCreated(d: DossierDrive) {
    setDossier(d)
    onUpdate(d)
  }

  function handleSynced(d: DossierDrive) {
    setDossier(d)
    onUpdate(d)
  }

  async function synchroniser() {
    if (syncPending || !dossier) return
    setSyncPending(true)
    try {
      const res  = await fetch('/api/captation/drive/synchroniser', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ culte_id: culteId }),
      })
      const json = await res.json() as { dossier?: DossierDrive; error?: string }
      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Erreur lors de la synchronisation')
      } else if (json.dossier) {
        toast.success('Stats Drive synchronisées')
        handleSynced(json.dossier)
      }
    } catch {
      toast.error('Impossible de contacter le serveur')
    } finally {
      setSyncPending(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cloud className={cn('h-4 w-4', dossier ? 'text-blue-500' : 'text-muted-foreground')} />
            Google Drive
          </CardTitle>
          {dossier && (
            <Button
              variant="ghost" size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={synchroniser}
              disabled={syncPending}
            >
              {syncPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <RefreshCw className="h-3.5 w-3.5" />
              }
              Synchroniser
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {dossier
          ? <EtatRempli culteId={culteId} dossier={dossier} onSynced={handleSynced} />
          : <EtatVide   culteId={culteId} onCreated={handleCreated} />
        }
      </CardContent>
    </Card>
  )
}
