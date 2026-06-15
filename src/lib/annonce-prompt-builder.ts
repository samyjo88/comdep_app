// Transforme les données structurées d'une annonce (les 7 rubriques) en un
// prompt clair pour l'IA, qui rédige le texte complet de l'annonce dominicale.

import { nombreEnLettres, montantEnLettres } from '@/lib/nombre-en-lettres'
import type { Culte, RubriqueAnnonce } from '@/types/annonces'
import type {
  SalutationData,
  CultePrecedentData,
  CulteJourData,
  ConferenceData,
  DistrictData,
  EgliseLocaleData,
  EvenementItem,
  CourierItem,
  InfoLocaleItem,
  ActiviteClasseItem,
} from '@/types/rubriques-data'
import { STRUCTURES_EGLISE, CLASSES_METHODISTES, TYPES_CULTE } from '@/types/rubriques-data'

// ── Helpers ────────────────────────────────────────────────────────────────

function parse<T>(json: string | null): Partial<T> | null {
  if (!json) return null
  try { return JSON.parse(json) as Partial<T> } catch { return null }
}

function ligne(label: string, valeur: string | null | undefined): string {
  return valeur && String(valeur).trim() !== '' ? `- ${label} : ${valeur}\n` : ''
}

function listeNoms(noms: string[] | undefined): string {
  return (noms ?? []).filter(n => n.trim() !== '').join(', ')
}

function dateLongue(dateStr: string | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function montant(valeur: string | undefined): string {
  const n = Number(valeur)
  if (!valeur || Number.isNaN(n) || n <= 0) return ''
  return `${valeur} FCFA (en toutes lettres : ${montantEnLettres(n)})`
}

function effectif(valeur: string | undefined): string {
  const n = Number(valeur)
  if (!valeur || Number.isNaN(n) || n < 0) return ''
  return `${valeur} (en toutes lettres : ${nombreEnLettres(n)})`
}

function labelTypeCulte(type: string | undefined, nomJournee: string | undefined): string {
  if (!type) return ''
  const label = TYPES_CULTE.find(t => t.value === type)?.label ?? type
  return type === 'journee_dedicacee' && nomJournee ? `${label} — ${nomJournee}` : label
}

function labelStructure(value: string | undefined): string {
  return STRUCTURES_EGLISE.find(s => s.value === value)?.label ?? (value ?? '')
}

// ── Sections ───────────────────────────────────────────────────────────────

function sectionSalutation(d: Partial<SalutationData>): string {
  let s = ''
  const responsable = [d.titre_responsable, d.responsable_prenom, d.responsable_nom]
    .filter(Boolean).join(' ').trim()
  s += ligne('Responsable des annonces', responsable)
  s += ligne('Texte de bienvenue', d.texte_bienvenue)
  if (d.type_ouverture === 'chant') {
    s += ligne('Chant d\'ouverture', d.texte_ouverture)
  } else {
    s += ligne('Verset d\'ouverture', d.texte_ouverture)
    s += ligne('Référence du verset', d.reference_ouverture)
  }
  if (d.sommaire && d.sommaire.length > 0) {
    s += `- Sommaire à annoncer : ${d.sommaire.join(' ; ')}\n`
  }
  return s
}

function sectionCultePrecedent(d: Partial<CultePrecedentData>): string {
  let s = ''
  s += ligne('Type de culte', labelTypeCulte(d.type_culte, d.nom_journee))
  s += ligne('Président du culte', d.president_culte)
  s += ligne('Officiant principal (prédication)', d.officiant_principal)
  s += ligne('Assistants', listeNoms(d.assistants))
  s += ligne('Autres présences notables', listeNoms(d.autres_presences))
  s += ligne('Thème de la méditation', d.theme_predication)
  const textes = (d.textes_bibliques ?? []).filter(t => t.trim() !== '')
  s += ligne('Textes bibliques', textes.join(' ; ') || d.verset_meditation)
  s += ligne('Assistance totale', effectif(d.assistance))
  s += ligne('Hommes', effectif(d.hommes))
  s += ligne('Femmes', effectif(d.femmes))
  s += ligne('Enfants', effectif(d.enfants))
  s += ligne('Chorale principale', d.chorale_principale || d.animation_louange)
  s += ligne('Groupes supplémentaires (louange)', listeNoms(d.groupes_supplementaires))
  s += ligne('Offrande ordinaire', montant(d.offrande_ordinaire))
  s += ligne('Objet de l\'offrande ordinaire', d.objet_offrande_ordinaire)
  s += ligne('Offrande spéciale', montant(d.offrande_speciale))
  s += ligne('Objet de l\'offrande spéciale', d.objet_offrande_speciale)
  s += ligne('Dîmes', montant(d.dime))
  s += ligne('Offrande ECODIM', montant(d.offrande_ecodim))
  s += ligne('Autres informations', d.autres_informations)
  return s
}

function sectionCulteJour(d: Partial<CulteJourData>): string {
  let s = ''
  s += ligne('Heure de début', d.heure_debut)
  s += ligne('Type de culte', labelTypeCulte(d.type_culte, d.nom_journee))
  s += ligne('Président du culte', d.president_culte)
  s += ligne('Officiant principal (prédication)', d.predicateur)
  s += ligne('Assistants', listeNoms(d.assistants))
  s += ligne('Autres présences notables', listeNoms(d.autres_presences))
  s += ligne('Thème de la prédication', d.theme_predication)
  s += ligne('Chorale principale', d.chorale_principale || d.animation_louange)
  s += ligne('Groupes supplémentaires (louange)', listeNoms(d.groupes_supplementaires))
  if (d.offrande_ordinaire_prevue) s += '- Offrande ordinaire prévue : oui\n'
  if (d.offrande_speciale_prevue) {
    s += `- Offrande spéciale prévue : oui${d.offrande_speciale_objet ? ` (objet : ${d.offrande_speciale_objet})` : ''}\n`
  }
  s += ligne('Événement spécial', d.evenement_special)
  return s
}

function blocEvenements(evenements: EvenementItem[] | undefined): string {
  const valides = (evenements ?? []).filter(e => e.titre?.trim())
  if (valides.length === 0) return ''
  let s = 'Événements :\n'
  for (const e of valides) {
    s += `  • ${e.titre}`
    if (e.date) s += ` — ${dateLongue(e.date)}`
    if (e.heure_debut) s += `, de ${e.heure_debut}${e.heure_fin ? ` à ${e.heure_fin}` : ''}`
    if (e.lieu) s += `, lieu : ${e.lieu}`
    s += '\n'
    if (e.consignes?.trim()) s += `    Consignes : ${e.consignes.trim().replace(/\n/g, ' ; ')}\n`
  }
  return s
}

function blocCourriers(courriers: CourierItem[] | undefined): string {
  const valides = (courriers ?? []).filter(c => c.objet?.trim() || c.contenu?.trim())
  if (valides.length === 0) return ''
  let s = 'Courriers :\n'
  for (const c of valides) {
    s += `  • Objet : ${c.objet || '(sans objet)'}\n`
    if (c.resume_ia?.trim()) {
      s += `    Résumé validé (à utiliser) : ${c.resume_ia.trim()}\n`
    } else if (c.contenu?.trim()) {
      s += `    Contenu brut (à résumer en 2-3 phrases) : ${c.contenu.trim()}\n`
    }
  }
  return s
}

function sectionExterne(d: Partial<DistrictData> & Partial<ConferenceData>): string {
  let s = blocEvenements(d.evenements)
  s += ligne('Notes (événements)', d.notes_evenements ?? d.notes)
  s += blocCourriers(d.courriers)
  s += ligne('Notes (courriers)', d.notes_courriers)
  return s
}

function sectionEgliseLocale(d: Partial<EgliseLocaleData>): string {
  let s = ''
  const infos = (d.infos ?? []).filter(
    (i: InfoLocaleItem) => i.structure && (i.contenu?.trim() || i.evenement_nom?.trim())
  )
  for (const i of infos) {
    s += `  • [${labelStructure(i.structure)}] `
    if (i.type === 'evenement') {
      s += `Événement : ${i.evenement_nom}`
      if (i.evenement_date) s += ` — ${dateLongue(i.evenement_date)}`
      if (i.evenement_heure) s += ` à ${i.evenement_heure}`
      if (i.evenement_lieu) s += `, lieu : ${i.evenement_lieu}`
      s += '\n'
      if (i.consignes?.trim()) s += `    Consignes : ${i.consignes.trim().replace(/\n/g, ' ; ')}\n`
    } else {
      s += `${i.type === 'rappel' ? 'Rappel' : 'Annonce'} : ${i.contenu}\n`
    }
  }
  const activites = (d.activites_classes ?? []).filter(
    (a: ActiviteClasseItem) => a.classe && a.activite?.trim()
  )
  if (activites.length > 0) {
    s += 'Activités des classes méthodistes :\n'
    for (const a of activites) {
      const classe = CLASSES_METHODISTES.find(c => c.value === a.classe)?.label ?? a.classe
      s += `  • [${classe}] ${a.activite}`
      if (a.date) s += ` — ${dateLongue(a.date)}`
      if (a.heure) s += ` à ${a.heure}`
      if (a.lieu) s += `, lieu : ${a.lieu}`
      s += '\n'
      if (a.consignes?.trim()) s += `    Consignes : ${a.consignes.trim().replace(/\n/g, ' ; ')}\n`
    }
  }
  s += ligne('Annonces internes générales', d.annonces_internes)
  s += ligne('Appel aux dons', d.appel_dons)
  return s
}

// ── Construction du prompt ──────────────────────────────────────────────────

const TITRES: Record<string, string> = {
  salutation:      'SALUTATION',
  culte_precedent: 'CULTE PRÉCÉDENT (compte rendu)',
  culte_jour:      'CULTE DU JOUR',
  conference:      'INFORMATIONS DE LA CONFÉRENCE',
  district:        'INFORMATIONS DU DISTRICT ABIDJAN NORD',
  circuit:         'INFORMATIONS DU CIRCUIT DE ANGRÉ',
  eglise_local:    'INFORMATIONS DE L\'ÉGLISE LOCALE',
}

export function buildAnnoncePrompt(culte: Culte, rubriques: RubriqueAnnonce[]): string {
  let prompt = `Rédige le texte complet de l'annonce dominicale du culte du ${dateLongue(culte.date_culte)}.\n`
  if (culte.theme) prompt += `Thème du culte : ${culte.theme}\n`
  prompt += '\nVoici les données saisies, rubrique par rubrique. N\'utilise que ces données.\n'

  const parOrdre = [...rubriques].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))

  for (const r of parOrdre) {
    const data = parse<Record<string, unknown>>(r.donnees_brutes)
    let section = ''
    if (data) {
      switch (r.code_rubrique) {
        case 'salutation':      section = sectionSalutation(data as Partial<SalutationData>); break
        case 'culte_precedent': section = sectionCultePrecedent(data as Partial<CultePrecedentData>); break
        case 'culte_jour':      section = sectionCulteJour(data as Partial<CulteJourData>); break
        case 'conference':
        case 'district':
        case 'circuit':         section = sectionExterne(data as Partial<DistrictData>); break
        case 'eglise_local':    section = sectionEgliseLocale(data as Partial<EgliseLocaleData>); break
      }
    }
    // Texte déjà validé rubrique par rubrique : sert de référence de contenu
    if (!section.trim() && r.texte_final?.trim()) {
      section = `Texte validé pour cette rubrique (reprendre le contenu) :\n${r.texte_final.trim()}\n`
    }
    if (section.trim()) {
      prompt += `\n## ${TITRES[r.code_rubrique] ?? r.code_rubrique}\n${section}`
    }
  }

  prompt += '\nRédige maintenant le texte complet, d\'un seul tenant, prêt à être lu à voix haute.'
  return prompt
}
