// Programmation centralisée des cultes : un culte est partagé par les
// modules Annonces, Cantiques (setlists), Sonorisation, Captation et
// Projection. Fonctions serveur uniquement (client Supabase admin) :
// les appelants vérifient les droits avant d'écrire.

import { createAdminClient } from '@/lib/supabase/admin'
import { createAnnonce } from '@/lib/annonces'
import { assurerDossierDriveCulte } from '@/lib/captation-drive'
import { insertNotifications, type NotifInput } from '@/lib/cron-notifications'
import { sendNotificationEmails } from '@/lib/resend'
import { capitalize, formatDateLong } from '@/lib/utils'
import {
  formatHeure, typeParDefaut,
  type AffectationRole, type CulteProgramme, type MembreResume, type RoleSon, type TypeCulte,
} from '@/types/cultes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

const SELECT_CULTE = `
  *,
  annonces ( id, statut_global ),
  setlists ( id, statut, setlist_items ( id ) ),
  planning_captation ( role_du_jour, membres_captation ( id, prenom, nom, email ) ),
  planning_projection ( role_du_jour, membres_projection ( id, prenom, nom, email ) )
`

function premier<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null
  return v ?? null
}

function resume(m: Row | null | undefined): MembreResume | null {
  if (!m) return null
  return { id: String(m.id), nom: `${m.prenom} ${m.nom}`.trim(), email: m.email ?? null }
}

/** « jeudi 6 novembre 2026 à 18h30 » */
export function libelleDateCulte(date: string, heure: string | null): string {
  const h = formatHeure(heure)
  return `${formatDateLong(date)}${h ? ` à ${h}` : ''}`
}

// ── Lecture ────────────────────────────────────────────────────────────────

async function chargerSon(dates: string[]) {
  const db = createAdminClient()
  if (dates.length === 0) return new Map<string, Row>()
  const { data: plannings } = await db
    .from('planning_son')
    .select('id, date_culte, responsable_id, assistant1_id, assistant2_id')
    .in('date_culte', dates)
  const ids = [...new Set((plannings ?? []).flatMap((p: Row) =>
    [p.responsable_id, p.assistant1_id, p.assistant2_id].filter(Boolean)))]
  const { data: membres } = ids.length > 0
    ? await db.from('membres_son').select('id, prenom, nom, email').in('id', ids)
    : { data: [] }
  const parId = new Map<number, Row>((membres ?? []).map((m: Row) => [m.id, m]))
  return new Map<string, Row>((plannings ?? []).map((p: Row) => [p.date_culte, { ...p, parId }]))
}

function construire(c: Row, son: Map<string, Row>): CulteProgramme {
  const s = son.get(c.date_culte)
  const affectationsSon: Partial<Record<RoleSon, MembreResume>> = {}
  if (s) {
    for (const role of ['responsable', 'assistant1', 'assistant2'] as RoleSon[]) {
      const m = resume(s.parId.get(s[`${role}_id`]))
      if (m) affectationsSon[role] = m
    }
  }
  const setlist  = premier(c.setlists as Row | Row[] | null)
  const annonce  = premier(c.annonces as Row | Row[] | null)
  const roles = (lignes: Row[] | null, cle: string): AffectationRole[] =>
    (lignes ?? [])
      .map(l => ({ role: l.role_du_jour as string, membre: resume(l[cle]) }))
      .filter((a): a is AffectationRole => a.membre !== null)

  return {
    id:          c.id,
    date_culte:  c.date_culte,
    heure_debut: c.heure_debut ?? null,
    type_culte:  (c.type_culte as TypeCulte | undefined) ?? typeParDefaut(c.date_culte),
    libelle:     c.libelle ?? null,
    theme:       c.theme ?? null,
    predicateur: c.predicateur ?? null,
    annonce:     annonce ? { id: annonce.id, statut_global: annonce.statut_global } : null,
    setlist:     setlist
      ? { id: setlist.id, statut: setlist.statut, nbChants: (setlist.setlist_items ?? []).length }
      : null,
    son:         s ? { id: s.id, affectations: affectationsSon } : null,
    captation:   roles(c.planning_captation, 'membres_captation'),
    projection:  roles(c.planning_projection, 'membres_projection'),
  }
}

/** Cultes à venir (aujourd'hui inclus), du plus proche au plus lointain. */
export async function getProgrammeCultes(limite = 30): Promise<CulteProgramme[]> {
  const db    = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await db
    .from('cultes')
    .select(SELECT_CULTE)
    .gte('date_culte', today)
    .order('date_culte', { ascending: true })
    .limit(limite)
  if (error) throw new Error(error.message)
  const cultes = (data ?? []) as Row[]
  const son = await chargerSon(cultes.map(c => c.date_culte))
  return cultes.map(c => construire(c, son))
}

export interface ChantSetlist {
  position: number
  titre:    string
  numero:   string | null
  moment:   string | null
}

export async function getCulteDetail(id: string): Promise<(CulteProgramme & { chants: ChantSetlist[] }) | null> {
  const db = createAdminClient()
  const { data, error } = await db.from('cultes').select(SELECT_CULTE).eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const son   = await chargerSon([data.date_culte])
  const culte = construire(data, son)

  let chants: ChantSetlist[] = []
  if (culte.setlist) {
    const { data: items } = await db
      .from('setlist_items')
      .select('position, moment_culte, cantiques ( titre, numero_gad )')
      .eq('setlist_id', culte.setlist.id)
      .order('position', { ascending: true })
    chants = (items ?? []).map((i: Row) => {
      const c = premier(i.cantiques as Row | Row[] | null)
      return {
        position: i.position,
        titre:    c?.titre ?? 'Cantique',
        numero:   c?.numero_gad ?? null,
        moment:   i.moment_culte ?? null,
      }
    })
  }
  return { ...culte, chants }
}

export interface EquipesDisponibles {
  son:        MembreResume[]
  captation:  (MembreResume & { roles: string[] })[]
  projection: (MembreResume & { roles: string[] })[]
}

/** Membres actifs de chaque équipe, pour les listes de désignation. */
export async function getEquipesDisponibles(): Promise<EquipesDisponibles> {
  const db = createAdminClient()
  const [son, cap, proj] = await Promise.all([
    db.from('membres_son').select('id, prenom, nom, email').eq('actif', true).order('prenom'),
    db.from('membres_captation').select('id, prenom, nom, email, roles').eq('actif', true).order('prenom'),
    db.from('membres_projection').select('id, prenom, nom, email, roles').eq('actif', true).order('prenom'),
  ])
  const avecRoles = (rows: Row[] | null) =>
    (rows ?? []).map(m => ({ ...(resume(m) as MembreResume), roles: (m.roles ?? []) as string[] }))
  return {
    son:        (son.data ?? []).map((m: Row) => resume(m) as MembreResume),
    captation:  avecRoles(cap.data),
    projection: avecRoles(proj.data),
  }
}

// ── Écriture ───────────────────────────────────────────────────────────────

export interface NouveauCulte {
  date_culte:  string
  heure_debut: string | null
  type_culte:  TypeCulte
  libelle:     string | null
  theme:       string | null
  predicateur: string | null
}

/**
 * Crée le culte. Si la migration 034 n'est pas encore appliquée, réessaie
 * sans les nouvelles colonnes (type, heure, libellé) pour ne pas bloquer.
 */
export async function insererCulte(c: NouveauCulte): Promise<{ id?: string; existant?: string; error?: string }> {
  const db = createAdminClient()
  const base = { date_culte: c.date_culte, theme: c.theme, predicateur: c.predicateur, statut: 'a_venir' }
  let res = await db.from('cultes')
    .insert({ ...base, heure_debut: c.heure_debut, type_culte: c.type_culte, libelle: c.libelle })
    .select('id').single()
  if (res.error && /column|schema cache/i.test(res.error.message)) {
    res = await db.from('cultes').insert(base).select('id').single()
  }
  if (res.error) {
    if (/unique|duplicate/i.test(res.error.message)) {
      const { data } = await db.from('cultes').select('id').eq('date_culte', c.date_culte).maybeSingle()
      return { existant: data?.id, error: 'Un culte est déjà programmé à cette date.' }
    }
    return { error: res.error.message }
  }
  return { id: res.data.id as string }
}

/**
 * Garantit qu'un culte existe dans tous les modules : ligne `cultes` et
 * ligne de planning sonorisation (rappels automatiques à l'équipe son)
 * et dossier Google Drive de la captation.
 * Appelé par chaque module qui crée un culte. Retourne l'id du culte.
 */
export async function rattacherCulte(dateCulte: string): Promise<string | null> {
  const db = createAdminClient()
  const culte = { date_culte: dateCulte, statut: 'a_venir' }
  const options = { onConflict: 'date_culte', ignoreDuplicates: true }
  const res = await db.from('cultes').upsert({ ...culte, type_culte: typeParDefaut(dateCulte) }, options)
  if (res.error && /column|schema cache/i.test(res.error.message)) {
    await db.from('cultes').upsert(culte, options)   // migration 034 non appliquée
  }
  if (typeParDefaut(dateCulte) === 'semaine') {
    // Culte créé par un module sans type : la valeur par défaut (dominical) est fausse en semaine
    await db.from('cultes').update({ type_culte: 'semaine' })
      .eq('date_culte', dateCulte).eq('type_culte', 'dominical')
  }
  await db.from('planning_son').upsert(
    { date_culte: dateCulte, statut: 'planifie' },
    { onConflict: 'date_culte', ignoreDuplicates: true },
  )
  const { data } = await db.from('cultes').select('id').eq('date_culte', dateCulte).maybeSingle()
  // Dossier Drive de la captation (Photos + Vidéos), créé une seule fois
  if (data?.id) await assurerDossierDriveCulte(data.id)
  return data?.id ?? null
}

export async function preparerAnnonce(culteId: string): Promise<string | null> {
  const db = createAdminClient()
  const { data } = await db.from('annonces').select('id').eq('culte_id', culteId).limit(1)
  if (data && data.length > 0) return data[0].id as string
  const res = await createAnnonce(culteId)
  return res.data?.id ?? null
}

export async function preparerSetlist(culteId: string, titre: string | null): Promise<string | null> {
  const db = createAdminClient()
  const { data } = await db.from('setlists').select('id').eq('culte_id', culteId).maybeSingle()
  if (data) return data.id as string
  const res = await db.from('setlists')
    .insert({ culte_id: culteId, titre_setlist: titre, statut: 'brouillon' })
    .select('id').single()
  return res.data?.id ?? null
}

export async function affecterSon(
  dateCulte: string,
  affectations: Partial<Record<RoleSon, string | null>>,
): Promise<{ error?: string }> {
  const db = createAdminClient()
  const ligne: Row = { date_culte: dateCulte, updated_at: new Date().toISOString() }
  for (const [role, id] of Object.entries(affectations)) {
    ligne[`${role}_id`] = id ? Number(id) : null
  }
  const { error } = await db.from('planning_son').upsert(ligne, { onConflict: 'date_culte' })
  return error ? { error: error.message } : {}
}

export async function affecterRoles(
  table: 'planning_captation' | 'planning_projection',
  culteId: string,
  affectations: Record<string, string | null>,
): Promise<{ error?: string }> {
  const db = createAdminClient()
  for (const [role, membreId] of Object.entries(affectations)) {
    const { error } = membreId
      ? await db.from(table).upsert(
          { culte_id: culteId, membre_id: membreId, role_du_jour: role, statut: 'planifie' },
          { onConflict: 'culte_id,role_du_jour' },
        )
      : await db.from(table).delete().eq('culte_id', culteId).eq('role_du_jour', role)
    if (error) return { error: error.message }
  }
  return {}
}

// ── Notifications ──────────────────────────────────────────────────────────

export interface Avis {
  emails:  string[]
  module:  NotifInput['module']
  titre:   string
  message: string
  lien:    string
}

/** Notification dans l'application + e-mail aux personnes concernées. */
export async function envoyerAvis(avis: Avis[]): Promise<{ envoyes: number }> {
  const utiles = avis.filter(a => a.emails.length > 0)
  if (utiles.length === 0) return { envoyes: 0 }
  const db = createAdminClient()
  await insertNotifications(db, utiles)
  let envoyes = 0
  for (const a of utiles) {
    const r = await sendNotificationEmails(a.emails, a.titre, a.message, a.lien)
    envoyes += r.sent
  }
  return { envoyes }
}

export function titreCulte(c: { date_culte: string; heure_debut: string | null }): string {
  return capitalize(libelleDateCulte(c.date_culte, c.heure_debut))
}
