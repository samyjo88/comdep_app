'use server'

import { revalidatePath } from 'next/cache'
import { getModulesAccessibles } from '@/lib/dashboard/modules-access'
import type { ModuleCode } from '@/lib/auth/guards'
import {
  affecterRoles, affecterSon, envoyerAvis, getCulteDetail, insererCulte,
  preparerAnnonce, preparerSetlist, rattacherCulte, titreCulte,
  type Avis, type NouveauCulte,
} from '@/lib/cultes'
import {
  ROLES_PROJECTION, ROLES_SON, TYPES_CULTE,
  type CulteProgramme, type MembreResume, type RoleSon,
} from '@/types/cultes'
import { ROLES_BY_CODE } from '@/types/captation'
import type { RoleCaptation } from '@/types/captation'

type Affectations = Record<string, string | null>

async function droits() {
  const modules = await getModulesAccessibles()
  if (modules !== null && modules.length === 0) {
    throw new Error('Accès refusé : vous ne faites partie d’aucune équipe.')
  }
  return (m: ModuleCode) => modules === null || modules.includes(m)
}

function revalider(id?: string) {
  revalidatePath('/cultes')
  if (id) revalidatePath(`/cultes/${id}`)
  revalidatePath('/dashboard')
  revalidatePath('/annonces')
  revalidatePath('/sonorisation/planning')
  revalidatePath('/captation/planning')
  revalidatePath('/projection/planning')
}

// ── Messages ───────────────────────────────────────────────────────────────

function nomCulte(c: { libelle: string | null; type_culte: keyof typeof TYPES_CULTE }) {
  return c.libelle || TYPES_CULTE[c.type_culte].label.toLowerCase()
}

function libelleRole(module: 'son' | 'captation' | 'projection', role: string): string {
  if (module === 'son')        return ROLES_SON.find(r => r.code === role)?.label ?? role
  if (module === 'projection') return ROLES_PROJECTION.find(r => r.code === role)?.label ?? role
  return ROLES_BY_CODE[role as RoleCaptation]?.label ?? role
}

const MODULE_NOTIF = { son: 'son', captation: 'captation', projection: 'projection' } as const

function avisAffectation(
  culte: CulteProgramme,
  module: 'son' | 'captation' | 'projection',
  role: string,
  membre: MembreResume,
): Avis {
  const quand = titreCulte(culte)
  const conseils = {
    son:        'Pense à vérifier le matériel avant le culte.',
    captation:  'Pense à préparer ton matériel de prise de vue.',
    projection: 'Pense à charger la liste des cantiques dans Proclaim.',
  }[module]
  return {
    emails:  membre.email ? [membre.email] : [],
    module:  MODULE_NOTIF[module],
    titre:   `📅 Tu es programmé(e) — ${quand}`,
    message: `${membre.nom.split(' ')[0]}, tu es désigné(e) « ${libelleRole(module, role)} » pour le ${nomCulte(culte)} du ${quand}. ${conseils}`,
    lien:    `/cultes/${culte.id}`,
  }
}

function avisRappel(
  culte: CulteProgramme,
  module: 'son' | 'captation' | 'projection',
  role: string,
  membre: MembreResume,
): Avis {
  const quand = titreCulte(culte)
  return {
    emails:  membre.email ? [membre.email] : [],
    module:  MODULE_NOTIF[module],
    titre:   `🔔 Rappel — ${nomCulte(culte)} du ${quand}`,
    message: `Rappel : tu assures « ${libelleRole(module, role)} » pour le ${nomCulte(culte)} du ${quand}. Merci de confirmer ta présence auprès de ton responsable.`,
    lien:    `/cultes/${culte.id}`,
  }
}

function affectationsCulte(c: CulteProgramme) {
  return {
    son:        Object.entries(c.son?.affectations ?? {}).map(([role, membre]) => ({ role, membre: membre as MembreResume })),
    captation:  c.captation,
    projection: c.projection,
  }
}

// ── Programmer un culte ────────────────────────────────────────────────────

export interface ProgrammationCulte {
  culte:      NouveauCulte
  annonces:   boolean
  cantiques:  boolean
  son:        Partial<Record<RoleSon, string | null>>
  captation:  Affectations
  projection: Affectations
  prevenir:   boolean
}

export async function programmerCulte(
  p: ProgrammationCulte,
): Promise<{ id?: string; existant?: string; error?: string; avertissements?: string[] }> {
  const peut = await droits()
  const c = p.culte
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date_culte)) return { error: 'Date du culte invalide.' }
  if (c.heure_debut && !/^\d{2}:\d{2}$/.test(c.heure_debut)) return { error: 'Heure invalide.' }

  const cree = await insererCulte(c)
  if (cree.error || !cree.id) return { error: cree.error, existant: cree.existant }
  const id = cree.id
  const avertissements: string[] = []

  // Le culte apparaît dans tous les modules (dont le planning son et ses rappels)
  await rattacherCulte(c.date_culte)

  if (p.annonces) {
    if (peut('annonces')) await preparerAnnonce(id)
    else avertissements.push('Annonces non préparées : vous n’avez pas accès au module Annonces.')
  }
  if (p.cantiques) {
    await preparerSetlist(id, c.libelle || c.theme)
  }

  const sections = [
    ['son',        p.son],
    ['captation',  p.captation],
    ['projection', p.projection],
  ] as const
  for (const [module, affect] of sections) {
    const choix = Object.fromEntries(Object.entries(affect).filter(([, v]) => v))
    if (Object.keys(choix).length === 0) continue
    if (!peut(module)) {
      avertissements.push(`Équipe ${module} non désignée : vous n’avez pas accès à ce module.`)
      continue
    }
    const r = module === 'son'
      ? await affecterSon(c.date_culte, choix)
      : await affecterRoles(module === 'captation' ? 'planning_captation' : 'planning_projection', id, choix)
    if (r.error) avertissements.push(`Désignation ${module} : ${r.error}`)
  }

  if (p.prevenir) {
    const culte = await getCulteDetail(id)
    if (culte) {
      const a = affectationsCulte(culte)
      await envoyerAvis([
        ...a.son.map(x => avisAffectation(culte, 'son', x.role, x.membre)),
        ...a.captation.map(x => avisAffectation(culte, 'captation', x.role, x.membre)),
        ...a.projection.map(x => avisAffectation(culte, 'projection', x.role, x.membre)),
      ])
    }
  }

  revalider(id)
  return { id, avertissements }
}

// ── Désigner une équipe depuis la fiche du culte ──────────────────────────

export async function designerEquipe(
  culteId: string,
  module: 'son' | 'captation' | 'projection',
  affectations: Affectations,
  prevenir: boolean,
): Promise<{ error?: string; prevenus?: number }> {
  const peut = await droits()
  if (!peut(module)) return { error: 'Accès refusé à ce module.' }

  const avant = await getCulteDetail(culteId)
  if (!avant) return { error: 'Culte introuvable.' }

  const r = module === 'son'
    ? await affecterSon(avant.date_culte, affectations)
    : await affecterRoles(module === 'captation' ? 'planning_captation' : 'planning_projection', culteId, affectations)
  if (r.error) return { error: r.error }

  let prevenus = 0
  if (prevenir) {
    const apres = await getCulteDetail(culteId)
    if (apres) {
      const anciens = new Set(affectationsCulte(avant)[module].map(x => `${x.role}:${x.membre.id}`))
      const nouveaux = affectationsCulte(apres)[module].filter(x => !anciens.has(`${x.role}:${x.membre.id}`))
      const res = await envoyerAvis(nouveaux.map(x => avisAffectation(apres, module, x.role, x.membre)))
      prevenus = res.envoyes
    }
  }

  revalider(culteId)
  return { prevenus }
}

// ── Relancer les équipes ──────────────────────────────────────────────────

export async function relancerEquipes(
  culteId: string,
  modules: ('son' | 'captation' | 'projection')[],
): Promise<{ error?: string; envoyes?: number; sansEmail?: number }> {
  const peut = await droits()
  const culte = await getCulteDetail(culteId)
  if (!culte) return { error: 'Culte introuvable.' }

  const a = affectationsCulte(culte)
  const cibles = modules.filter(peut).flatMap(m => a[m].map(x => ({ module: m, ...x })))
  if (cibles.length === 0) return { error: 'Personne n’est encore désigné pour ce culte.' }

  const { envoyes } = await envoyerAvis(cibles.map(x => avisRappel(culte, x.module, x.role, x.membre)))
  return { envoyes, sansEmail: cibles.filter(x => !x.membre.email).length }
}

// ── Préparer les annonces / la liste des cantiques après coup ─────────────

export async function preparerModule(
  culteId: string,
  quoi: 'annonces' | 'cantiques',
): Promise<{ error?: string; id?: string }> {
  const peut = await droits()
  if (quoi === 'annonces' && !peut('annonces')) return { error: 'Accès refusé au module Annonces.' }
  const culte = await getCulteDetail(culteId)
  if (!culte) return { error: 'Culte introuvable.' }
  const id = quoi === 'annonces'
    ? await preparerAnnonce(culteId)
    : await preparerSetlist(culteId, culte.libelle || culte.theme)
  if (!id) return { error: 'La préparation a échoué.' }
  revalider(culteId)
  return { id }
}
