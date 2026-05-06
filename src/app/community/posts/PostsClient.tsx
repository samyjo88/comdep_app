'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sheet, SheetTrigger, SheetContent, SheetHeader,
  SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, LayoutList, Columns3, Pencil, Trash2 } from 'lucide-react'
import { PLATEFORMES_CONFIG, PLATEFORMES_BY_CODE, STATUTS_POST } from '@/types/community'
import { createPostAction, updatePostAction, deletePostAction, updateStatutPostAction } from './actions'
import type { Post, MembreCM, Plateforme, StatutPost, TypeContenu } from '@/types/community'

// ── Types ─────────────────────────────────────────────────────────────────────

type View = 'list' | 'kanban'

interface PostsClientProps {
  posts:      Post[]
  membres:    MembreCM[]
  planningId: string | null
}

const TYPES_CONTENU: TypeContenu[] = ['photo', 'video', 'reel', 'story', 'texte', 'annonce', 'citation', 'evenement']

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function PlateBadge({ plateforme, mobileIconOnly = false }: { plateforme: Plateforme; mobileIconOnly?: boolean }) {
  const cfg = PLATEFORMES_BY_CODE[plateforme]
  if (!cfg) return null
  return (
    <Badge
      variant="outline"
      className="text-xs h-6 px-1.5 shrink-0 gap-0.5"
      style={{ borderColor: cfg.couleur + '60', color: cfg.couleur }}
    >
      <span>{cfg.icone}</span>
      <span className={mobileIconOnly ? 'hidden sm:inline' : ''}>{cfg.label}</span>
    </Badge>
  )
}

function StatutBadge({ statut }: { statut: StatutPost }) {
  const COLOR: Record<StatutPost, string> = {
    a_faire:               'bg-slate-100 text-slate-600',
    en_creation:           'bg-amber-100 text-amber-700',
    en_attente_validation: 'bg-purple-100 text-purple-700',
    programme:             'bg-blue-100 text-blue-700',
    publie:                'bg-green-100 text-green-700',
    annule:                'bg-red-100 text-red-700',
  }
  const LABEL: Record<StatutPost, string> = {
    a_faire:               'À faire',
    en_creation:           'En création',
    en_attente_validation: 'En attente',
    programme:             'Programmé',
    publie:                'Publié',
    annule:                'Annulé',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${COLOR[statut]}`}>
      {LABEL[statut]}
    </span>
  )
}

// ── PostForm ──────────────────────────────────────────────────────────────────

interface PostFormProps {
  planningId:  string | null
  editingPost: Post | null
  onDone:      () => void
}

function PostForm({ planningId, editingPost, onDone }: PostFormProps) {
  const [plateforme,  setPlateforme]  = useState<string>(editingPost?.plateforme  ?? 'instagram')
  const [typeContenu, setTypeContenu] = useState<string>(editingPost?.type_contenu ?? 'photo')
  const [statut,      setStatut]      = useState<string>(editingPost?.statut       ?? 'a_faire')
  const [titre,       setTitre]       = useState(editingPost?.titre       ?? '')
  const [description, setDescription] = useState(editingPost?.description ?? '')
  const [dateHeure,   setDateHeure]   = useState(
    editingPost?.date_publication_prevue
      ? editingPost.date_publication_prevue.slice(0, 16)
      : '',
  )
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    try {
      const payload = {
        semaine_planning_id:     planningId,
        culte_id:                null,
        plateforme:              plateforme as Plateforme,
        type_contenu:            typeContenu as TypeContenu,
        titre:                   titre || null,
        description:             description || null,
        lien_media:              null,
        date_publication_prevue: dateHeure ? new Date(dateHeure).toISOString() : null,
        date_publication_reelle: null,
        statut:                  statut as StatutPost,
        assignee_id:             null,
        url_post_publie:         null,
        nb_likes:                null,
        nb_commentaires:         null,
        nb_partages:             null,
        nb_vues:                 null,
        notes:                   null,
      }
      const result = editingPost
        ? await updatePostAction(editingPost.id, payload)
        : await createPostAction(payload)
      if (result.error) { setErr(result.error); return }
      onDone()
    } catch (e) {
      setErr(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="plateforme">Plateforme</Label>
          <Select value={plateforme} onValueChange={setPlateforme}>
            <SelectTrigger id="plateforme"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLATEFORMES_CONFIG.map(p => (
                <SelectItem key={p.code} value={p.code}>{p.icone} {p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="type_contenu">Type</Label>
          <Select value={typeContenu} onValueChange={setTypeContenu}>
            <SelectTrigger id="type_contenu"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES_CONTENU.map(t => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="titre">Titre</Label>
        <Input
          id="titre"
          value={titre}
          onChange={e => setTitre(e.target.value)}
          placeholder="Titre du post…"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Texte ou caption…"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date de publication</Label>
          <Input
            id="date"
            type="datetime-local"
            value={dateHeure}
            onChange={e => setDateHeure(e.target.value)}
            className="text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="statut">Statut</Label>
          <Select value={statut} onValueChange={setStatut}>
            <SelectTrigger id="statut"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUTS_POST.map(s => (
                <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {err && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{err}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? 'Enregistrement…' : editingPost ? 'Mettre à jour' : 'Créer le post'}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </form>
  )
}

// ── ListView ──────────────────────────────────────────────────────────────────

function ListView({
  posts,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  posts:          Post[]
  onEdit:         (p: Post) => void
  onDelete:       (id: string) => void
  onStatusChange: (id: string, s: StatutPost) => void
}) {
  if (posts.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Aucun post pour cette sélection.
      </p>
    )
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="sm:hidden space-y-3">
        {posts.map(post => (
          <Card key={post.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <PlateBadge plateforme={post.plateforme} />
                  <span className="text-xs text-muted-foreground capitalize">{post.type_contenu}</span>
                </div>
                <StatutBadge statut={post.statut} />
              </div>
              <p className="text-sm font-medium line-clamp-2 leading-snug">
                {post.titre ?? post.description ?? '(sans titre)'}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(post.date_publication_prevue)}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Select
                  value={post.statut}
                  onValueChange={v => onStatusChange(post.id, v as StatutPost)}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTS_POST.map(s => (
                      <SelectItem key={s.code} value={s.code} className="text-xs">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => onEdit(post)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-red-500 hover:text-red-700" onClick={() => onDelete(post.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plateforme</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Titre</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {posts.map(post => (
              <tr key={post.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <PlateBadge plateforme={post.plateforme} />
                </td>
                <td className="px-4 py-3 max-w-[240px]">
                  <p className="truncate font-medium">{post.titre ?? '(sans titre)'}</p>
                  {post.description && (
                    <p className="truncate text-xs text-muted-foreground mt-0.5">{post.description}</p>
                  )}
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{post.type_contenu}</td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDate(post.date_publication_prevue)}
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={post.statut}
                    onValueChange={v => onStatusChange(post.id, v as StatutPost)}
                  >
                    <SelectTrigger className="h-7 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUTS_POST.map(s => (
                        <SelectItem key={s.code} value={s.code} className="text-xs">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(post)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-500 hover:text-red-700"
                      onClick={() => onDelete(post.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── KanbanView ────────────────────────────────────────────────────────────────

function KanbanView({
  posts,
  onEdit,
  onStatusChange,
}: {
  posts:          Post[]
  onEdit:         (p: Post) => void
  onStatusChange: (id: string, s: StatutPost) => void
}) {
  const byStatut = STATUTS_POST.reduce<Record<string, Post[]>>((acc, s) => {
    acc[s.code] = posts.filter(p => p.statut === s.code)
    return acc
  }, {})

  const NEXT_STATUS: Record<StatutPost, StatutPost | null> = {
    a_faire:               'en_creation',
    en_creation:           'en_attente_validation',
    en_attente_validation: 'programme',
    programme:             'publie',
    publie:                null,
    annule:                null,
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
      {STATUTS_POST.map(statut => {
        const colPosts = byStatut[statut.code] ?? []
        return (
          <div key={statut.code} className="flex-shrink-0 w-[260px]">
            <div className="rounded-xl bg-muted/50 border p-3 h-full min-h-[200px]">
              {/* Column header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: statut.couleur }} />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {statut.label}
                  </span>
                </div>
                <span className="text-xs font-bold tabular-nums text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                  {colPosts.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {colPosts.map(post => {
                  const plate = PLATEFORMES_BY_CODE[post.plateforme]
                  const nextStatut = NEXT_STATUS[post.statut]
                  return (
                    <div
                      key={post.id}
                      className="bg-background rounded-lg border p-3 space-y-2 shadow-sm"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-base leading-none mt-0.5 shrink-0">{plate?.icone ?? '📄'}</span>
                        <p className="text-xs font-medium line-clamp-2 leading-snug flex-1 min-w-0">
                          {post.titre ?? post.description ?? '(sans titre)'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] text-muted-foreground capitalize">{post.type_contenu}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(post.date_publication_prevue)}</span>
                      </div>
                      <div className="flex items-center gap-1 pt-0.5">
                        {nextStatut && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2 flex-1"
                            onClick={() => onStatusChange(post.id, nextStatut)}
                          >
                            →
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0"
                          onClick={() => onEdit(post)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {colPosts.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/50 text-center py-4">
                    Aucun post
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── PostsClient (main) ────────────────────────────────────────────────────────

export default function PostsClient({ posts, membres, planningId }: PostsClientProps) {
  const router                            = useRouter()
  const [, startTransition]               = useTransition()
  const [view,         setView]           = useState<View>('list')
  const [filterPlate,  setFilterPlate]    = useState<Plateforme | 'all'>('all')
  const [sheetOpen,    setSheetOpen]      = useState(false)
  const [editingPost,  setEditingPost]    = useState<Post | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void membres // available for future assignee selection

  const filtered = filterPlate === 'all'
    ? posts
    : posts.filter(p => p.plateforme === filterPlate)

  function refresh() {
    startTransition(() => router.refresh())
  }

  function openCreate() {
    setEditingPost(null)
    setSheetOpen(true)
  }

  function openEdit(post: Post) {
    setEditingPost(post)
    setSheetOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce post ?')) return
    await deletePostAction(id)
    refresh()
  }

  async function handleStatusChange(id: string, statut: StatutPost) {
    await updateStatutPostAction(id, statut)
    refresh()
  }

  function handleDone() {
    setSheetOpen(false)
    setEditingPost(null)
    refresh()
  }

  return (
    <div className="space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        {/* Platform filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant={filterPlate === 'all' ? 'default' : 'outline'}
            className="h-7 px-2 text-xs"
            onClick={() => setFilterPlate('all')}
          >
            Tous
          </Button>
          {PLATEFORMES_CONFIG.map(p => (
            <Button
              key={p.code}
              size="sm"
              variant={filterPlate === p.code ? 'default' : 'outline'}
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setFilterPlate(filterPlate === p.code ? 'all' : p.code)}
            >
              <span>{p.icone}</span>
              {/* Text hidden on mobile */}
              <span className="hidden sm:inline">{p.label}</span>
            </Button>
          ))}
        </div>

        {/* Right: view toggle + new post */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex rounded-md border overflow-hidden">
            <Button
              size="sm"
              variant={view === 'list' ? 'default' : 'ghost'}
              className="h-7 w-7 rounded-none p-0 border-0"
              onClick={() => setView('list')}
              title="Vue liste"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant={view === 'kanban' ? 'default' : 'ghost'}
              className="h-7 w-7 rounded-none p-0 border-0 border-l"
              onClick={() => setView('kanban')}
              title="Vue Kanban"
            >
              <Columns3 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                Nouveau post
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>{editingPost ? 'Modifier le post' : 'Nouveau post'}</SheetTitle>
                <SheetDescription>
                  {editingPost ? 'Modifiez les informations du post.' : 'Planifiez un nouveau post sur les réseaux sociaux.'}
                </SheetDescription>
              </SheetHeader>
              <SheetBody>
                <PostForm
                  planningId={planningId}
                  editingPost={editingPost}
                  onDone={handleDone}
                />
              </SheetBody>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ── Count label ──────────────────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} post{filtered.length !== 1 ? 's' : ''}
        {filterPlate !== 'all' ? ` sur ${PLATEFORMES_BY_CODE[filterPlate]?.label ?? filterPlate}` : ' au total'}
      </p>

      {/* ── Views ────────────────────────────────────────────────────────────── */}
      {view === 'list' ? (
        <ListView
          posts={filtered}
          onEdit={openEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <KanbanView
          posts={filtered}
          onEdit={openEdit}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Edit sheet (opened programmatically) */}
      {editingPost && (
        <Sheet open={sheetOpen && !!editingPost} onOpenChange={open => { if (!open) { setSheetOpen(false); setEditingPost(null) } }}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Modifier le post</SheetTitle>
              <SheetDescription>Modifiez les informations du post.</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <PostForm
                planningId={planningId}
                editingPost={editingPost}
                onDone={handleDone}
              />
            </SheetBody>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
