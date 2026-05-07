/**
 * GET /api/cron/community
 * Cron horaire — Module Community Management.
 *
 * Vérification :
 *  Post encore "programme" (planifié) après sa date/heure de publication prévue
 *  → alerte retard à l'assigné (via membres_cm.email → profiles) ou aux admins.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  getSupabaseAdmin, verifyCronAuth, insertNotifications,
  type NotifInput, type AnyRow,
} from '@/lib/cron-notifications'

export const dynamic = 'force-dynamic'

const PLATEFORME_LABEL: Record<string, string> = {
  facebook:  'Facebook',
  instagram: 'Instagram',
  whatsapp:  'WhatsApp',
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  try {
    supabase = getSupabaseAdmin()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const now = new Date()
  const inputs: NotifInput[] = []

  // Posts planifiés dont la date de publication est passée
  const { data: postsEnRetard, error: postsErr } = await supabase
    .from('posts')
    .select('id, titre, plateforme, date_publication_prevue, assignee_id')
    .eq('statut', 'programme')
    .lt('date_publication_prevue', now.toISOString())

  if (postsErr) {
    return NextResponse.json({ error: postsErr.message }, { status: 500 })
  }

  if ((postsEnRetard ?? []).length === 0) {
    return NextResponse.json({
      success: true,
      module:  'cm',
      checks:  { postsEnRetard: 0 },
      inserted: 0,
      skipped:  0,
    })
  }

  // Résoudre les assignee_id (membres_cm) → emails
  const assigneeIds = [...new Set(
    (postsEnRetard as AnyRow[])
      .map(p => p.assignee_id)
      .filter(Boolean) as number[]
  )]

  const assigneeEmailMap: Record<number, string> = {}
  if (assigneeIds.length > 0) {
    const { data: membres } = await supabase
      .from('membres_cm')
      .select('id, email')
      .in('id', assigneeIds)
    for (const m of (membres ?? []) as AnyRow[]) {
      if (m.email) assigneeEmailMap[m.id as number] = m.email as string
    }
  }

  for (const post of (postsEnRetard ?? []) as AnyRow[]) {
    const plateformeLabel = PLATEFORME_LABEL[post.plateforme as string] ?? String(post.plateforme)
    const titreTronque    = post.titre
      ? String(post.titre).length > 60
        ? String(post.titre).slice(0, 60) + '…'
        : String(post.titre)
      : 'Sans titre'

    const datePrevue = new Date(post.date_publication_prevue as string)
    const dateFr     = datePrevue.toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    })

    const email = post.assignee_id ? assigneeEmailMap[post.assignee_id as number] : undefined

    inputs.push({
      emails:  email ? [email] : [],   // fallback admins si non résolu
      module:  'cm',
      titre:   `⏰ Post en retard — ${plateformeLabel}`,
      message: `Le post "${titreTronque}" (${plateformeLabel}) était planifié pour le ${dateFr} mais n'a pas encore été publié.`,
      lien:    '/community/planning',
    })
  }

  const { inserted, skipped } = await insertNotifications(supabase, inputs)

  return NextResponse.json({
    success:  true,
    module:   'cm',
    checks:   {
      postsEnRetard: (postsEnRetard ?? []).length,
    },
    inserted,
    skipped,
  })
}
