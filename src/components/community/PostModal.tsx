'use client'

import { useState, useTransition, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ExternalLink, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  Post,
  MembreCM,
  Plateforme,
  TypeContenu,
  StatutPost,
} from '@/types/community'
import {
  PLATEFORMES_CONFIG,
  STATUTS_POST,
  STATUTS_POST_BY_CODE,
} from '@/types/community'
import type { Culte } from '@/types/annonces'
import {
  creerPostAction,
  modifierPostAction,
  type PostPayload,
} from '@/app/community/posts/actions'

// ── Platform-specific content types ──────────────────────────────────────────

const TYPES_PAR_PLATEFORME: Record<Plateforme, { code: TypeContenu; label: string }[]> = {
  facebook:  [
    { code: 'photo',      label: 'Photo' },
    { code: 'video',      label: 'Vidéo' },
    { code: 'texte',      label: 'Texte' },
    { code: 'evenement',  label: 'Événement' },
    { code: 'annonce',    label: 'Annonce' },
  ],
  instagram: [
    { code: 'photo',      label: 'Photo' },
    { code: 'reel',       label: 'Reel' },
    { code: 'story',      label: 'Story' },
    { code: 'carrousel',  label: 'Carrousel' },
    { code: 'citation',   label: 'Citation' },
  ],
  whatsapp:  [
    { code: 'texte',      label: 'Texte' },
    { code: 'annonce',    label: 'Annonce' },
    { code: 'programme',  label: 'Programme' },
  ],
  youtube:   [
    { code: 'video',      label: 'Vidéo' },
    { code: 'short',      label: 'Short' },
  ],
  twitter:   [
    { code: 'texte',      label: 'Texte' },
    { code: 'photo',      label: 'Photo' },
    { code: 'video',      label: 'Vidéo' },
  ],
  tiktok:    [
    { code: 'video',      label: 'Vidéo' },
    { code: 'duet',       label: 'Duet' },
  ],
}

// ── Character limits per platform ─────────────────────────────────────────────

const CHAR_LIMITS: Partial<Record<Plateforme, number>> = {
  instagram: 2200,
  twitter:   280,
  facebook:  63206,
}

// ── Avatar helper ─────────────────────────────────────────────────────────────

function initiales(m: MembreCM) {
  return `${m.prenom[0] ?? ''}${m.nom[0] ?? ''}`.toUpperCase()
}

const AVATAR_COLORS = [
  '#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6',
  '#EC4899','#06B6D4','#84CC16','#F97316','#6366F1','#14B8A6','#A855F7',
]

function avatarColor(id: string) {
  const sum = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const postSchema = z.object({
  plateforme:              z.enum(['facebook','instagram','whatsapp','youtube','twitter','tiktok']),
  type_contenu:            z.enum([
    'photo','video','reel','story','texte','annonce','citation','evenement',
    'carrousel','programme','short','duet',
  ]),
  titre:                   z.string().max(200).optional(),
  description:             z.string().optional(),
  lien_media:              z
    .string()
    .refine(v => !v || v.startsWith('http'), { message: 'URL invalide' })
    .optional(),
  date_publication_prevue: z.string().min(1, 'La date est obligatoire'),
  assignee_id:             z.string().optional(),
  lier_culte:              z.boolean(),
  culte_id:                z.string().optional(),
  // Edit-only
  statut:                  z.enum([
    'a_faire','en_creation','en_attente_validation','programme','publie','annule',
  ]),
  url_post_publie:         z.string().optional(),
  nb_likes:                z.coerce.number().int().nonnegative().nullable().optional(),
  nb_commentaires:         z.coerce.number().int().nonnegative().nullable().optional(),
  nb_partages:             z.coerce.number().int().nonnegative().nullable().optional(),
  nb_vues:                 z.coerce.number().int().nonnegative().nullable().optional(),
  notes:                   z.string().optional(),
})

type FormData = z.infer<typeof postSchema>

// ── Section heading helper ────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2 pb-1 border-t first:border-t-0 first:pt-0">
      {children}
    </h3>
  )
}

// ── PostModal ─────────────────────────────────────────────────────────────────

export function PostModal({
  open,
  onClose,
  semaine,
  post,
  membres,
  cultes,
  initialValues,
  onSuccess,
}: {
  open:          boolean
  onClose:       () => void
  semaine:       string
  post:          Post | null
  membres:       MembreCM[]
  cultes:        Culte[]
  initialValues?: {
    plateforme?:   string
    type_contenu?: string
    titre?:        string
    description?:  string
  }
  onSuccess?:    () => void
}) {
  const isEdit = !!post
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const defaultValues: FormData = post
    ? {
        plateforme:              post.plateforme,
        type_contenu:            post.type_contenu,
        titre:                   post.titre ?? '',
        description:             post.description ?? '',
        lien_media:              post.lien_media ?? '',
        date_publication_prevue: post.date_publication_prevue
          ? post.date_publication_prevue.slice(0, 16)
          : '',
        assignee_id:             post.assignee_id ?? '',
        lier_culte:              !!post.culte_id,
        culte_id:                post.culte_id ?? '',
        statut:                  post.statut,
        url_post_publie:         post.url_post_publie ?? '',
        nb_likes:                post.nb_likes ?? undefined,
        nb_commentaires:         post.nb_commentaires ?? undefined,
        nb_partages:             post.nb_partages ?? undefined,
        nb_vues:                 post.nb_vues ?? undefined,
        notes:                   post.notes ?? '',
      }
    : {
        plateforme:              (initialValues?.plateforme as FormData['plateforme']) ?? 'facebook',
        type_contenu:            (initialValues?.type_contenu as FormData['type_contenu']) ?? 'photo',
        titre:                   initialValues?.titre ?? '',
        description:             initialValues?.description ?? '',
        lien_media:              '',
        date_publication_prevue: '',
        assignee_id:             '',
        lier_culte:              false,
        culte_id:                '',
        statut:                  'a_faire',
        url_post_publie:         '',
        notes:                   '',
      }

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(postSchema), defaultValues })

  // Reset form when post changes (open different post)
  useEffect(() => {
    reset(defaultValues)
    setServerError(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id, open])

  const plateforme  = watch('plateforme')
  const description = watch('description') ?? ''
  const lienMedia   = watch('lien_media') ?? ''
  const lierCulte   = watch('lier_culte')
  const statut      = watch('statut') as StatutPost

  // Reset type_contenu when plateforme changes if current type invalid
  const typesDisponibles = TYPES_PAR_PLATEFORME[plateforme] ?? []
  const currentType      = watch('type_contenu')
  useEffect(() => {
    if (!typesDisponibles.find(t => t.code === currentType)) {
      setValue('type_contenu', typesDisponibles[0]?.code ?? 'photo')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plateforme])

  const charLimit = CHAR_LIMITS[plateforme]
  const charCount = description.length
  const charOver  = charLimit ? charCount > charLimit : false

  function handleClose() {
    reset(defaultValues)
    setServerError(null)
    onClose()
  }

  function onSubmit(data: FormData) {
    const payload: PostPayload = {
      plateforme:              data.plateforme,
      type_contenu:            data.type_contenu,
      titre:                   data.titre?.trim() || null,
      description:             data.description?.trim() || null,
      lien_media:              data.lien_media?.trim() || null,
      date_publication_prevue: data.date_publication_prevue
        ? new Date(data.date_publication_prevue).toISOString()
        : null,
      assignee_id:             data.assignee_id?.trim() || null,
      culte_id:                data.lier_culte ? (data.culte_id?.trim() || null) : null,
      statut:                  data.statut,
      url_post_publie:         data.url_post_publie?.trim() || null,
      nb_likes:                data.nb_likes ?? null,
      nb_commentaires:         data.nb_commentaires ?? null,
      nb_partages:             data.nb_partages ?? null,
      nb_vues:                 data.nb_vues ?? null,
      notes:                   data.notes?.trim() || null,
    }

    startTransition(async () => {
      const result = isEdit
        ? await modifierPostAction(post!.id, payload)
        : await creerPostAction(semaine, payload)

      if (!result.success) {
        setServerError(result.error)
        return
      }

      toast.success(isEdit ? 'Post modifié avec succès ✓' : 'Post ajouté avec succès ✓')
      onSuccess?.()
      handleClose()
    })
  }

  const platCfg = PLATEFORMES_CONFIG.find(p => p.code === plateforme)

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {platCfg && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ background: platCfg.couleurBg, color: platCfg.couleur }}
              >
                {platCfg.icone} {platCfg.label}
              </span>
            )}
            {isEdit ? 'Modifier le post' : 'Nouveau post'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">

          {/* ── Section : Où et quoi ── */}
          <SectionTitle>Où et quoi</SectionTitle>

          <div className="grid grid-cols-2 gap-3">
            {/* Plateforme */}
            <div className="space-y-1.5">
              <Label>Plateforme *</Label>
              <Controller
                name="plateforme"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATEFORMES_CONFIG.map(p => (
                        <SelectItem key={p.code} value={p.code}>
                          <span className="flex items-center gap-2">
                            <span>{p.icone}</span>
                            <span>{p.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Type de contenu */}
            <div className="space-y-1.5">
              <Label>Type de contenu *</Label>
              <Controller
                name="type_contenu"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typesDisponibles.map(t => (
                        <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* ── Section : Contenu ── */}
          <SectionTitle>Contenu</SectionTitle>

          {/* Titre */}
          <div className="space-y-1.5">
            <Label>Titre du post</Label>
            <Input
              {...register('titre')}
              placeholder="Titre (optionnel)"
            />
            {errors.titre && (
              <p className="text-xs text-destructive">{errors.titre.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Description / Légende</Label>
              {charLimit && (
                <span className={`text-xs tabular-nums ${charOver ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                  {charCount} / {charLimit.toLocaleString('fr-FR')}
                </span>
              )}
            </div>
            <Textarea
              {...register('description')}
              rows={4}
              placeholder="Texte du post…"
              className={charOver ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {charOver && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Dépassement de {charCount - charLimit!} caractère{charCount - charLimit! > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Lien média */}
          <div className="space-y-1.5">
            <Label>Lien vers le média</Label>
            <div className="flex gap-2">
              <Input
                {...register('lien_media')}
                placeholder="Lien Google Drive, Dropbox ou autre"
                className="flex-1"
              />
              {lienMedia && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1 text-xs"
                  onClick={() => window.open(lienMedia, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ouvrir
                </Button>
              )}
            </div>
            {errors.lien_media && (
              <p className="text-xs text-destructive">{errors.lien_media.message}</p>
            )}
          </div>

          {/* ── Section : Planning ── */}
          <SectionTitle>Planning</SectionTitle>

          {/* Date et heure */}
          <div className="space-y-1.5">
            <Label>Date et heure de publication *</Label>
            <Input
              type="datetime-local"
              {...register('date_publication_prevue')}
            />
            {errors.date_publication_prevue && (
              <p className="text-xs text-destructive">{errors.date_publication_prevue.message}</p>
            )}
          </div>

          {/* Assigné à */}
          <div className="space-y-1.5">
            <Label>Assigné à</Label>
            <Controller
              name="assignee_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="— Personne —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Personne —</SelectItem>
                    {membres.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0"
                            style={{ background: avatarColor(m.id) }}
                          >
                            {initiales(m)}
                          </span>
                          {m.prenom} {m.nom}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Lié au culte */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Controller
                name="lier_culte"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="lier_culte"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="lier_culte" className="cursor-pointer">
                Lié à un culte
              </Label>
            </div>

            {lierCulte && (
              <Controller
                name="culte_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un culte…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— Aucun —</SelectItem>
                      {cultes.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {new Date(c.date_culte + 'T12:00:00').toLocaleDateString('fr-FR', {
                                day: '2-digit', month: 'short', year: '2-digit',
                              })}
                            </span>
                            <span className="font-medium truncate">
                              {c.theme ?? (c.predicateur ? `Prédicateur : ${c.predicateur}` : 'Culte sans titre')}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </div>

          {/* ── Section : Suivi (edit only) ── */}
          {isEdit && (
            <>
              <SectionTitle>Suivi</SectionTitle>

              {/* Statut */}
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Controller
                  name="statut"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUTS_POST.map(s => (
                          <SelectItem key={s.code} value={s.code}>
                            <span className="flex items-center gap-2">
                              <span
                                className="inline-block h-2 w-2 rounded-full shrink-0"
                                style={{ background: s.couleur }}
                              />
                              {s.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {/* Current status badge */}
                {post && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs text-muted-foreground">Actuel :</span>
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{
                        background: STATUTS_POST_BY_CODE[post.statut].couleur + '22',
                        color: STATUTS_POST_BY_CODE[post.statut].couleur,
                      }}
                    >
                      {STATUTS_POST_BY_CODE[post.statut].label}
                    </Badge>
                  </div>
                )}
              </div>

              {/* URL publiée — only when statut = publie */}
              {statut === 'publie' && (
                <div className="space-y-1.5">
                  <Label>URL du post publié</Label>
                  <Input
                    {...register('url_post_publie')}
                    placeholder="https://…"
                  />
                </div>
              )}

              {/* Statistiques */}
              <div className="space-y-1.5">
                <Label>Statistiques</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">❤️ Likes</p>
                    <Input
                      type="number"
                      min={0}
                      {...register('nb_likes')}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">💬 Commentaires</p>
                    <Input
                      type="number"
                      min={0}
                      {...register('nb_commentaires')}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">🔁 Partages</p>
                    <Input
                      type="number"
                      min={0}
                      {...register('nb_partages')}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">👁 Vues</p>
                    <Input
                      type="number"
                      min={0}
                      {...register('nb_vues')}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notes (always visible) */}
          <div className="space-y-1.5">
            <Label>Notes internes</Label>
            <Textarea
              {...register('notes')}
              rows={2}
              placeholder="Remarques, consignes…"
            />
          </div>

          {serverError && (
            <p className="text-sm text-destructive flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {serverError}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || charOver}>
              {isPending
                ? (isEdit ? 'Enregistrement…' : 'Création…')
                : (isEdit ? 'Enregistrer' : 'Créer le post')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
