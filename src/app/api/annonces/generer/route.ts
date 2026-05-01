import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CodeRubrique } from '@/types/annonces'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const NOM_EGLISE = process.env.NEXT_PUBLIC_NOM_EGLISE ?? 'Notre Église'

// ── Prompts système par rubrique ────────────────────────────────────────────

const PROMPTS_SYSTEME: Record<CodeRubrique, string> = {
  salutation: `Tu es un rédacteur officiel de l'${NOM_EGLISE}. Rédige une salutation chaleureuse et solennelle pour l'assemblée du dimanche. Utilise les données fournies (responsable, texte de bienvenue, verset du jour, cantique) pour composer un message d'ouverture de culte. Le texte doit être formel, respectueux et encourageant. Maximum 150 mots.`,

  culte_precedent: `Tu es un rédacteur officiel de l'${NOM_EGLISE}. À partir des statistiques et informations du culte précédent, rédige un compte-rendu bref et structuré. Mentionne l'assistance, les offrandes (ordinaire, spéciale, dîme, écodim), le thème de la prédication, le verset de méditation et l'animation des louanges. Présente les chiffres avec précision et dignité. Maximum 200 mots.`,

  culte_jour: `Tu es un rédacteur officiel de l'${NOM_EGLISE}. Rédige l'annonce du programme du culte du jour en utilisant les informations fournies (heure, thème, prédicateur, animation des louanges, événement spécial). Le ton doit être accueillant et invitant, donnant envie aux fidèles de participer. Maximum 150 mots.`,

  conference: `Tu es un rédacteur officiel de l'${NOM_EGLISE}. À partir de la liste des événements et des notes fournis, rédige les annonces relatives aux activités de la conférence. Pour chaque événement, mentionne le titre, la date et le lieu. Sois clair et concis. Maximum 200 mots.`,

  district: `Tu es un rédacteur officiel de l'${NOM_EGLISE}. À partir des événements, courriers et notes du district, rédige les annonces du district de manière claire et structurée. Présente d'abord les événements (titre, date, lieu), puis les informations des courriers si pertinentes. Maximum 200 mots.`,

  circuit: `Tu es un rédacteur officiel de l'${NOM_EGLISE}. À partir des événements, courriers et notes du circuit, rédige les annonces du circuit de manière claire et structurée. Présente d'abord les événements (titre, date, lieu), puis les informations des courriers si pertinentes. Maximum 200 mots.`,

  eglise_local: `Tu es un rédacteur officiel de l'${NOM_EGLISE}. À partir des annonces internes, événements et appel aux dons fournis, rédige les annonces locales de l'église. Sois chaleureux et direct. Mets en valeur les événements à venir et tout appel aux dons. Maximum 200 mots.`,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildUserMessage(
  codeRubrique: CodeRubrique,
  donnees: unknown,
  annoncePrecedente?: string | null,
): string {
  let message = `Voici les données pour la rubrique "${codeRubrique}" :\n\n${JSON.stringify(donnees, null, 2)}`

  if (annoncePrecedente) {
    message += `\n\n---\nTexte de la même rubrique lors du dernier culte (pour référence de style) :\n${annoncePrecedente}`
  }

  message += '\n\nRédige le texte de cette rubrique en français.'
  return message
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { rubriqueId, codeRubrique, donnees, annoncePrecedente } = body as {
      rubriqueId:       string
      codeRubrique:     CodeRubrique
      donnees:          unknown
      annoncePrecedente?: string | null
    }

    if (!rubriqueId || !codeRubrique || donnees === undefined) {
      return Response.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const systemPrompt = PROMPTS_SYSTEME[codeRubrique]
    if (!systemPrompt) {
      return Response.json({ error: `Rubrique inconnue : ${codeRubrique}` }, { status: 400 })
    }

    const userMessage = buildUserMessage(codeRubrique, donnees, annoncePrecedente)

    // Appel Claude avec cache sur le system prompt (stable par rubrique)
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 800,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        { role: 'user', content: userMessage },
      ],
    })

    const texteGenere = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const tokensUtilises = response.usage.input_tokens + response.usage.output_tokens

    // Log best-effort (non-bloquant)
    logGeneration(rubriqueId, userMessage, texteGenere, tokensUtilises).catch(() => undefined)

    return Response.json({ texte_genere: texteGenere, tokens_utilises: tokensUtilises })
  } catch (err) {
    console.error('[/api/annonces/generer]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}

// ── Logging Supabase ──────────────────────────────────────────────────────────

async function logGeneration(
  rubriqueId: string,
  promptEnvoye: string,
  texteRecu: string,
  tokensUtilises: number,
): Promise<void> {
  try {
    const cookieStore = await cookies()
    const db = createServerClient(
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from('historique_generations').insert({
      rubrique_id:     rubriqueId,
      prompt_envoye:   promptEnvoye,
      texte_recu:      texteRecu,
      tokens_utilises: tokensUtilises,
    })
  } catch {
    // Log failure is non-fatal
  }
}
