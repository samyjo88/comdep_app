import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'
import type { Post, Plateforme, TypeContenu } from '@/types/community'

// ── Types internes ────────────────────────────────────────────────────────────

interface StatsPlateforme {
  prevu:  number
  publie: number
}

interface StatsTypeContenu {
  [type: string]: number
}

interface EngagementPost {
  id:          string
  titre:       string | null
  plateforme:  Plateforme
  type_contenu: TypeContenu
  likes:       number | null
  commentaires: number | null
  partages:    number | null
  vues:        number | null
}

interface DonneesAgregees {
  semaine_debut:    string
  semaine_fin:      string
  cm_nom:           string
  cm_role:          string | null
  posts_total:      number
  posts_publies:    number
  posts_en_attente: number
  posts_annules:    number
  posts_en_retard:  number
  taux_publication: number
  par_plateforme:   Record<Plateforme, StatsPlateforme>
  par_type_contenu: StatsTypeContenu
  engagement:       EngagementPost[]
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { unauthorized } = await requireAuth()
  if (unauthorized) return unauthorizedResponse()

  try {
    const body = await request.json()
    const { semaine_debut } = body as { semaine_debut?: string }

    if (!semaine_debut || !/^\d{4}-\d{2}-\d{2}$/.test(semaine_debut)) {
      return Response.json(
        { error: 'Paramètre semaine_debut manquant ou invalide (format YYYY-MM-DD requis)' },
        { status: 400 },
      )
    }

    const db = await getDb()
    const semaine_fin = getSemaineFin(semaine_debut)

    // ── ÉTAPE 1 : Collecte des données ────────────────────────────────────────

    // Planning + CM responsable
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: planning, error: planningError } = await (db as any)
      .from('planning_cm')
      .select('*, membres_cm(*)')
      .eq('semaine_debut', semaine_debut)
      .maybeSingle()

    if (planningError) {
      return Response.json({ error: planningError.message }, { status: 500 })
    }

    const cmNom  = planning?.membres_cm
      ? `${planning.membres_cm.prenom} ${planning.membres_cm.nom}`
      : 'Non assigné'
    const cmRole = planning?.membres_cm?.specialites?.[0] ?? null

    // Posts de la semaine
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawPosts, error: postsError } = planning
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? await (db as any)
          .from('posts')
          .select('*')
          .eq('semaine_planning_id', planning.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : await (db as any)
          .from('posts')
          .select('*')
          .gte('date_publication_prevue', semaine_debut)
          .lte('date_publication_prevue', semaine_fin)

    if (postsError) {
      return Response.json({ error: postsError.message }, { status: 500 })
    }

    const posts = (rawPosts ?? []) as Post[]

    // Calcul des agrégats
    const donneesAgregees = aggregerDonnees(semaine_debut, semaine_fin, cmNom, cmRole, posts)

    // ── ÉTAPE 2 : Génération IA ───────────────────────────────────────────────

    const resumeTexte = await genererRapportIA(donneesAgregees)

    // ── ÉTAPE 3 : Sauvegarde ──────────────────────────────────────────────────

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rapport, error: rapportError } = await (db as any)
      .from('rapports_cm')
      .upsert(
        {
          semaine_debut,
          contenu_json:  donneesAgregees as unknown as Record<string, unknown>,
          resume_texte:  resumeTexte,
          genere_le:     new Date().toISOString(),
        },
        { onConflict: 'semaine_debut' },
      )
      .select()
      .single()

    if (rapportError) {
      return Response.json({ error: rapportError.message }, { status: 500 })
    }

    // ── ÉTAPE 4 : Retour ──────────────────────────────────────────────────────

    return Response.json({
      rapport_id:  rapport.id,
      resume_texte: resumeTexte,
      stats:        donneesAgregees,
    })
  } catch (err) {
    console.error('[/api/community/rapport]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}

// ── Supabase client ───────────────────────────────────────────────────────────

async function getDb() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) => {
          try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch { /* Route Handler */ }
        },
      },
    },
  )
}

// ── Agrégation ────────────────────────────────────────────────────────────────

const PLATEFORMES: Plateforme[] = ['facebook', 'instagram', 'whatsapp', 'youtube', 'twitter', 'tiktok']

function aggregerDonnees(
  semaine_debut: string,
  semaine_fin:   string,
  cmNom:         string,
  cmRole:        string | null,
  posts:         Post[],
): DonneesAgregees {
  const now = new Date().toISOString()

  let publies    = 0
  let annules    = 0
  let en_attente = 0
  let en_retard  = 0

  const parPlateforme = Object.fromEntries(
    PLATEFORMES.map(p => [p, { prevu: 0, publie: 0 }]),
  ) as Record<Plateforme, StatsPlateforme>

  const parType: StatsTypeContenu = {}
  const engagement: EngagementPost[] = []

  for (const post of posts) {
    // Comptages par statut
    if (post.statut === 'publie')       publies++
    else if (post.statut === 'annule')  annules++
    else                                en_attente++

    // Posts en retard : date prévue dépassée et non publiés/annulés
    if (
      post.date_publication_prevue &&
      post.date_publication_prevue < now &&
      post.statut !== 'publie' &&
      post.statut !== 'annule'
    ) {
      en_retard++
    }

    // Répartition par plateforme
    const plt = post.plateforme as Plateforme
    if (parPlateforme[plt]) {
      parPlateforme[plt].prevu++
      if (post.statut === 'publie') parPlateforme[plt].publie++
    }

    // Répartition par type de contenu
    parType[post.type_contenu] = (parType[post.type_contenu] ?? 0) + 1

    // Engagement (seulement si au moins une stat renseignée)
    if (
      post.nb_likes != null ||
      post.nb_commentaires != null ||
      post.nb_partages != null ||
      post.nb_vues != null
    ) {
      engagement.push({
        id:           post.id,
        titre:        post.titre,
        plateforme:   post.plateforme,
        type_contenu: post.type_contenu,
        likes:        post.nb_likes,
        commentaires: post.nb_commentaires,
        partages:     post.nb_partages,
        vues:         post.nb_vues,
      })
    }
  }

  const total = posts.length
  const taux  = total > 0 ? Math.round((publies / total) * 100) : 0

  return {
    semaine_debut,
    semaine_fin,
    cm_nom:           cmNom,
    cm_role:          cmRole,
    posts_total:      total,
    posts_publies:    publies,
    posts_en_attente: en_attente,
    posts_annules:    annules,
    posts_en_retard:  en_retard,
    taux_publication: taux,
    par_plateforme:   parPlateforme,
    par_type_contenu: parType,
    engagement,
  }
}

// ── Génération IA ─────────────────────────────────────────────────────────────

const PROMPT_SYSTEME = `Tu es analyste en community management pour une église en Côte d'Ivoire.
Tu rédiges des rapports hebdomadaires professionnels mais accessibles.
Ton style : bienveillant, encourageant, factuel.
Utilise des émojis avec modération (1-2 par section).`

async function genererRapportIA(donnees: DonneesAgregees): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const plateformesActives = Object.entries(donnees.par_plateforme)
    .filter(([, s]) => s.prevu > 0)
    .map(([p, s]) => `- ${p} : ${s.prevu} prévu(s), ${s.publie} publié(s)`)
    .join('\n')

  const userPrompt = `Génère un rapport hebdomadaire pour la semaine du ${donnees.semaine_debut} au ${donnees.semaine_fin}.

CM responsable : ${donnees.cm_nom}${donnees.cm_role ? ` (${donnees.cm_role})` : ''}
Posts prévus : ${donnees.posts_total} | Publiés : ${donnees.posts_publies} | En attente : ${donnees.posts_en_attente} | Annulés : ${donnees.posts_annules}
Taux de publication : ${donnees.taux_publication}%

Répartition par plateforme :
${plateformesActives || '(aucun post planifié)'}

Structure le rapport avec ces sections :
1. Résumé exécutif (2-3 phrases clés)
2. Performance par plateforme (1-2 phrases par plateforme active)
3. Points forts de la semaine
4. Points d'attention (si taux < 80% ou posts en retard)
5. Recommandations pour la semaine suivante (3 actions concrètes)`

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-5',
    max_tokens: 1200,
    system: [
      {
        type: 'text',
        text: PROMPT_SYSTEME,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  })

  const block = response.content[0]
  return block.type === 'text' ? block.text : ''
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

function getSemaineFin(semaineDebut: string): string {
  const d = new Date(semaineDebut)
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
}
