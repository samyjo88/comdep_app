// Données du tableau de bord (requêtes Supabase agrégées)
import { createClient } from '@/lib/supabase/server'

function lundiSemaine(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  return monday.toISOString().slice(0, 10)
}

function dimancheSemaine(): string {
  const lundi = new Date(lundiSemaine() + 'T00:00:00')
  lundi.setDate(lundi.getDate() + 6)
  return lundi.toISOString().slice(0, 10)
}

// ── Types ──────────────────────────────────────────────────────────────────

export type StatutModule = 'ok' | 'action' | 'urgent' | 'incomplet'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>

export interface ModuleInfo {
  prochainCulte: { date: string; responsables: string[] } | null
  statut:        StatutModule
  nbTaches:      number
}

export interface MembreUnifie {
  id:          number
  prenom:      string
  nom:         string
  email:       string | null
  telephone:   string | null
  departement: string
  couleur:     string
  bg:          string
}

// ── Données ────────────────────────────────────────────────────────────────

export async function getDashboardData() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const today    = new Date().toISOString().slice(0, 10)
  const lundi    = lundiSemaine()
  const dimanche = dimancheSemaine()

  const [
    sonPlanningRes,
    sonMembresRes,
    cultesRes,
    captationMembresRes,
    cmMembresRes,
    cmPostsEnAttenteRes,
    cantiquesRes,
    membresRes,
    projPlanningRes,
    materielAlerteRes,
    postsSemaineRes,
    cmSemaineRes,
    projMembresRes,
    annoncesMembresRes,
  ] = await Promise.all([
    supabase
      .from('planning_son')
      .select('id, date_culte, statut, responsable_id, assistant1_id, assistant2_id')
      .gte('date_culte', today)
      .neq('statut', 'passe')
      .order('date_culte', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('membres_son')
      .select('id, prenom, nom, email, telephone, actif')
      .eq('actif', true),
    supabase
      .from('cultes')
      .select(`
        id, date_culte, theme, predicateur, statut,
        annonces(
          id, statut_global,
          rubriques_annonce(id, valide, texte_final, texte_genere)
        )
      `)
      .eq('statut', 'a_venir')
      .order('date_culte', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('membres_captation')
      .select('id, prenom, nom, email, telephone, actif')
      .eq('actif', true),
    supabase
      .from('membres_cm')
      .select('id, prenom, nom, email, telephone, actif')
      .eq('actif', true),
    supabase
      .from('posts')
      .select('id, statut')
      .in('statut', ['a_faire', 'en_creation', 'en_attente_validation']),
    supabase
      .from('cantiques')
      .select('id, titre, statut')
      .gte('date_culte', today)
      .limit(10),
    supabase
      .from('membres')
      .select('id, actif')
      .eq('actif', true),
    supabase
      .from('plannings_semaine')
      .select('id, date_culte, responsable_id')
      .gte('date_culte', today)
      .order('date_culte', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('materiel_sono')
      .select('id, nom, marque, modele, statut, en_reparation, description_reparation')
      .or('en_reparation.eq.true,statut.eq.hors_service'),
    supabase
      .from('posts')
      .select('id, titre, plateforme, statut, date_publication_prevue')
      .in('plateforme', ['facebook', 'instagram', 'whatsapp'])
      .gte('date_publication_prevue', lundi)
      .lte('date_publication_prevue', dimanche)
      .order('date_publication_prevue', { ascending: true }),
    supabase
      .from('planning_cm')
      .select('id, semaine_debut, statut, membres_cm(id, prenom, nom)')
      .eq('semaine_debut', lundi)
      .maybeSingle(),
    supabase
      .from('membres_projection')
      .select('id, prenom, nom, email, telephone, actif')
      .eq('actif', true),
    supabase
      .from('membres_annonces')
      .select('id, prenom, nom, email, telephone, actif')
      .eq('actif', true),
  ])

  const prochainSon:        Row | null = sonPlanningRes.data ?? null
  const membresSon:         Row[]      = sonMembresRes.data ?? []
  const prochainCulte:      Row | null = cultesRes.data ?? null
  const membresCaptation:   Row[]      = captationMembresRes.data ?? []
  const membresCM:          Row[]      = cmMembresRes.data ?? []
  const membresProjection:  Row[]      = projMembresRes.data ?? []
  const membresAnnonces:    Row[]      = annoncesMembresRes.data ?? []
  const postsPending:     Row[]      = cmPostsEnAttenteRes.data ?? []
  const cantiques:        Row[]      = cantiquesRes.data ?? []
  const membresGeneraux:  Row[]      = membresRes.data ?? []
  const projPlanning:     Row | null = projPlanningRes.data ?? null
  const materielAlerte:   Row[]      = materielAlerteRes.data ?? []
  const postsSemaine:     Row[]      = postsSemaineRes.data ?? []
  const cmSemaine:        Row | null = cmSemaineRes.data ?? null

  let captationAssignments: Row[] = []
  if (prochainCulte?.id) {
    const { data } = await supabase
      .from('planning_captation')
      .select('id, role_du_jour, membres_captation(id, prenom, nom)')
      .eq('culte_id', prochainCulte.id)
    captationAssignments = data ?? []
  }

  // ── Statuts modules ────────────────────────────────────────────────────────

  const statutSono: StatutModule =
    !prochainSon               ? 'incomplet' :
    prochainSon.responsable_id ? 'ok'        : 'action'

  const annonceStatut = prochainCulte?.annonces?.[0]?.statut_global
  const joursAvantCulte = prochainCulte
    ? Math.round(
        (new Date(prochainCulte.date_culte + 'T00:00:00').getTime() - new Date(today).getTime())
        / 86400000
      )
    : null
  const annonceUrgente =
    prochainCulte &&
    joursAvantCulte !== null &&
    joursAvantCulte <= 3 &&
    annonceStatut !== 'publie' &&
    annonceStatut !== 'valide'
  const statutAnnonces: StatutModule =
    !prochainCulte                                             ? 'incomplet' :
    (annonceStatut === 'publie' || annonceStatut === 'valide') ? 'ok'        :
    annonceUrgente                                             ? 'urgent'    : 'action'

  const statutProjection: StatutModule =
    !projPlanning        ? 'incomplet' :
    cantiques.length > 0 ? 'ok'        : 'action'

  const statutCaptation: StatutModule =
    !prochainCulte                   ? 'incomplet' :
    captationAssignments.length >= 2 ? 'ok'        : 'action'

  const statutCommunity: StatutModule =
    membresCM.length === 0   ? 'incomplet' :
    postsPending.length > 0  ? 'action'    : 'ok'

  // ── Noms responsables ──────────────────────────────────────────────────────

  const idsSon = [
    prochainSon?.responsable_id,
    prochainSon?.assistant1_id,
    prochainSon?.assistant2_id,
  ].filter(Boolean)
  const responsablesSon = membresSon
    .filter((m: Row) => idsSon.includes(m.id))
    .map((m: Row) => `${m.prenom} ${m.nom}`)

  const responsablesProj: string[] = []
  if (projPlanning?.responsable_id) {
    const found = membresSon.find((m: Row) => m.id === projPlanning.responsable_id)
    if (found) responsablesProj.push(`${found.prenom} ${found.nom}`)
  }

  const responsablesCaptation = captationAssignments
    .map((a: Row) => a.membres_captation)
    .filter(Boolean)
    .map((m: Row) => `${m.prenom} ${m.nom}`)
    .slice(0, 3)

  const membreCM: string | null = cmSemaine?.membres_cm
    ? `${cmSemaine.membres_cm.prenom} ${cmSemaine.membres_cm.nom}`
    : null

  // ── Rubriques annonces ─────────────────────────────────────────────────────

  const rubriques: Row[] = prochainCulte?.annonces?.[0]?.rubriques_annonce ?? []
  const nbRubriquesTotal   = 7
  const nbRubriquesOk      = rubriques.filter((r: Row) => r.valide === true).length
  const nbRubriquesEnCours = rubriques.filter(
    (r: Row) => !r.valide && (r.texte_final || r.texte_genere)
  ).length
  const nbRubriquesAFaire  = nbRubriquesTotal - nbRubriquesOk - nbRubriquesEnCours

  // ── Matériel ───────────────────────────────────────────────────────────────

  const materielHorsService  = materielAlerte.filter((m: Row) => m.statut === 'hors_service')
  const materielEnReparation = materielAlerte.filter(
    (m: Row) => m.en_reparation && m.statut !== 'hors_service'
  )

  // ── Stats globales ─────────────────────────────────────────────────────────

  const nbMembresActifs =
    membresGeneraux.length > 0
      ? membresGeneraux.length
      : membresSon.length + membresCaptation.length + membresCM.length

  const modules: StatutModule[] = [
    statutSono, statutProjection, statutAnnonces, statutCaptation, statutCommunity,
  ]
  const tachesEnAttente = postsPending.length +
    modules.filter(s => s === 'action' || s === 'incomplet').length

  const dateProchainCulte =
    prochainSon?.date_culte ??
    prochainCulte?.date_culte ??
    null

  // ── Équipe unifiée ─────────────────────────────────────────────────────────

  const equipeUnifiee: MembreUnifie[] = [
    ...membresSon.map((m: Row) => ({
      id: m.id, prenom: m.prenom, nom: m.nom,
      email: m.email ?? null, telephone: m.telephone ?? null,
      departement: 'Sonorisation',
      couleur: 'text-info dark:text-info',
      bg: 'bg-info/15 dark:bg-info/5',
    })),
    ...membresCaptation.map((m: Row) => ({
      id: m.id + 10000, prenom: m.prenom, nom: m.nom,
      email: m.email ?? null, telephone: m.telephone ?? null,
      departement: 'Captation',
      couleur: 'text-danger dark:text-danger',
      bg: 'bg-danger/15 dark:bg-danger/5',
    })),
    ...membresCM.map((m: Row) => ({
      id: m.id + 20000, prenom: m.prenom, nom: m.nom,
      email: m.email ?? null, telephone: m.telephone ?? null,
      departement: 'Community',
      couleur: 'text-success dark:text-success',
      bg: 'bg-success/15 dark:bg-success/5',
    })),
    ...membresProjection.map((m: Row) => ({
      id: m.id + 30000, prenom: m.prenom, nom: m.nom,
      email: m.email ?? null, telephone: m.telephone ?? null,
      departement: 'Projection',
      couleur: 'text-purple-700 dark:text-purple-300',
      bg: 'bg-purple-100 dark:bg-purple-900/40',
    })),
    ...membresAnnonces.map((m: Row) => ({
      id: m.id + 40000, prenom: m.prenom, nom: m.nom,
      email: m.email ?? null, telephone: m.telephone ?? null,
      departement: 'Annonces',
      couleur: 'text-warning dark:text-warning',
      bg: 'bg-warning/15 dark:bg-warning/5',
    })),
  ]

  // ── Infos par module ───────────────────────────────────────────────────────

  const sonoInfo: ModuleInfo = {
    prochainCulte: prochainSon
      ? { date: prochainSon.date_culte, responsables: responsablesSon }
      : null,
    statut:   statutSono,
    nbTaches: statutSono !== 'ok' ? 1 : 0,
  }

  const projInfo: ModuleInfo = {
    prochainCulte: projPlanning
      ? { date: projPlanning.date_culte, responsables: responsablesProj }
      : null,
    statut:   statutProjection,
    nbTaches: cantiques.length === 0 && projPlanning ? 1 : 0,
  }

  const nbRubriquesManquantes = nbRubriquesAFaire + (annonceStatut == null ? 0 : nbRubriquesEnCours)
  const annoncesInfo: ModuleInfo = {
    prochainCulte: prochainCulte
      ? {
          date:         prochainCulte.date_culte,
          responsables: prochainCulte.predicateur ? [prochainCulte.predicateur] : [],
        }
      : null,
    statut:   statutAnnonces,
    nbTaches: statutAnnonces !== 'ok'
      ? (annonceStatut == null ? 1 : nbRubriquesManquantes || 1)
      : 0,
  }

  const captationInfo: ModuleInfo = {
    prochainCulte: prochainCulte
      ? { date: prochainCulte.date_culte, responsables: responsablesCaptation }
      : null,
    statut:   statutCaptation,
    nbTaches: captationAssignments.length === 0 && prochainCulte ? 1 : 0,
  }

  const communityInfo: ModuleInfo = {
    prochainCulte: prochainCulte
      ? { date: prochainCulte.date_culte, responsables: [] }
      : null,
    statut:   statutCommunity,
    nbTaches: postsPending.length,
  }

  return {
    dateProchainCulte,
    nbMembresActifs,
    tachesEnAttente,
    alerteAnnonces: annonceUrgente
      ? {
          jours:        joursAvantCulte!,
          statutGlobal: annonceStatut ?? null,
          culteDate:    prochainCulte!.date_culte,
          annonceId:    prochainCulte!.annonces?.[0]?.id ?? null,
          rubriquesOk:  nbRubriquesOk,
          rubriquesTotal: nbRubriquesTotal,
        }
      : null,
    sonoInfo, projInfo, annoncesInfo, captationInfo, communityInfo,
    equipe: {
      dateProchainCulte,
      son:       { membres: responsablesSon },
      projection:{ membres: responsablesProj },
      captation: { membres: responsablesCaptation },
      cm:        { membre: membreCM },
    },
    annoncesWidget: {
      culteDate:    prochainCulte?.date_culte ?? null,
      annonceId:    prochainCulte?.annonces?.[0]?.id ?? null,
      ok:           nbRubriquesOk,
      enCours:      nbRubriquesEnCours,
      aFaire:       nbRubriquesAFaire,
      total:        nbRubriquesTotal,
      statutGlobal: annonceStatut ?? null,
      joursAvant:   joursAvantCulte,
    },
    materielWidget: {
      horsService:   materielHorsService,
      enReparation:  materielEnReparation,
      total:         materielAlerte.length,
    },
    postsCMWidget: {
      posts:    postsSemaine,
      lundi,
      dimanche,
    },
    equipeUnifiee,
  }
}
