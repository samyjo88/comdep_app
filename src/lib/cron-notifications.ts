/**
 * Utilitaires partagés pour les routes cron de notifications.
 * Utilise le service role Supabase (bypass RLS) — ne jamais exposer côté client.
 */
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRow = Record<string, any>

// ── Client admin ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseAdmin(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || key === 'your-supabase-service-role-key') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY non configurée — voir .env.local')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── Sécurité cron ──────────────────────────────────────────────────────────

/**
 * Vérifie le header Authorization: Bearer <CRON_SECRET>.
 * Si CRON_SECRET n'est pas défini (dev local), laisse passer.
 * En production Vercel, CRON_SECRET est injecté automatiquement dans les
 * requêtes cron quand configuré dans les variables d'environnement.
 */
export function verifyCronAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

// ── Helpers date ───────────────────────────────────────────────────────────

export function dateToISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

export function formatDateFr(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

// ── Types notification ─────────────────────────────────────────────────────

export type ModuleNotif = 'son' | 'projection' | 'annonces' | 'captation' | 'cm' | 'general'

export interface NotifInput {
  /** Emails des destinataires cibles (résolus en user_id via profiles).
   *  Si vide ou introuvables, la notif part aux admin/responsables. */
  emails:  string[]
  module:  ModuleNotif
  titre:   string
  message: string
  lien?:   string | null
}

// ── Cœur : résolution + déduplication + insertion ─────────────────────────

/**
 * Résout les emails en user_ids (via la table profiles), construit les lignes
 * de notifications, filtre celles déjà envoyées dans les dernières 24h
 * (même user_id + module + titre), puis insère le reste en une seule passe.
 */
export async function insertNotifications(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  inputs:   NotifInput[],
): Promise<{ inserted: number; skipped: number }> {
  if (inputs.length === 0) return { inserted: 0, skipped: 0 }

  // 1. Résoudre les emails → user_ids
  const allEmails = [...new Set(inputs.flatMap(n => n.emails).filter(Boolean))]
  const emailToUserId: Record<string, string> = {}

  if (allEmails.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('email', allEmails)
    for (const p of (profiles ?? []) as AnyRow[]) {
      emailToUserId[p.email as string] = p.id as string
    }
  }

  // 2. Fallback : IDs des utilisateurs admin/responsable de l'application
  const { data: adminRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['super_admin', 'admin', 'responsable'])
  const adminIds: string[] = (adminRoles ?? []).map((r: AnyRow) => r.user_id as string)

  // 3. Construire les lignes candidates
  const rows: AnyRow[] = []
  for (const notif of inputs) {
    const resolvedIds = notif.emails
      .map(e => emailToUserId[e])
      .filter(Boolean) as string[]
    const targets = resolvedIds.length > 0 ? resolvedIds : adminIds

    for (const userId of targets) {
      rows.push({
        user_id: userId,
        module:  notif.module,
        titre:   notif.titre,
        message: notif.message,
        lien:    notif.lien ?? null,
      })
    }
  }

  if (rows.length === 0) return { inserted: 0, skipped: inputs.length }

  // 4. Déduplication : écarter les notifications identiques envoyées < 24h
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const userIds  = [...new Set(rows.map(r => r.user_id as string))]
  const modules  = [...new Set(rows.map(r => r.module as string))]

  const { data: recentes } = await supabase
    .from('notifications')
    .select('user_id, module, titre')
    .in('user_id', userIds)
    .in('module',  modules)
    .gte('created_at', since24h)

  const existingKeys = new Set(
    (recentes ?? []).map((n: AnyRow) => `${n.user_id}|${n.module}|${n.titre}`)
  )

  const newRows   = rows.filter(r => !existingKeys.has(`${r.user_id}|${r.module}|${r.titre}`))
  const nbSkipped = rows.length - newRows.length

  if (newRows.length === 0) return { inserted: 0, skipped: nbSkipped }

  // 5. Insertion en une seule requête
  const { data: inserted } = await supabase
    .from('notifications')
    .insert(newRows)
    .select('id')

  return { inserted: (inserted ?? []).length, skipped: nbSkipped }
}
