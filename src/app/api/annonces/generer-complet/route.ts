import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getAnnonceAvecCulte } from '@/lib/annonces'
import { buildAnnoncePrompt } from '@/lib/annonce-prompt-builder'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'

const NOM_EGLISE = process.env.NEXT_PUBLIC_NOM_EGLISE ?? 'Église Horeb de la Cité SIR'

const SYSTEM_PROMPT = `Tu es l'assistant de communication de l'${NOM_EGLISE}, une église méthodiste à Abidjan, Côte d'Ivoire.

Tu rédiges les annonces dominicales en français soutenu, dans un registre liturgique protestant évangélique, au style oral solennel, destinées à être lues à voix haute pendant le culte.

RÈGLES IMPÉRATIVES :
1. Tous les montants en FCFA sont écrits en toutes lettres.
   Exemples : 101325 → « cent un mille trois cent vingt-cinq francs »
              37000  → « trente-sept mille francs »
   Les conversions en toutes lettres sont fournies dans les données : utilise-les telles quelles.
2. Les effectifs (assistance) sont écrits en toutes lettres.
   Exemple : 189 → « cent quatre-vingt-neuf »
3. Le texte est continu, sans titres, sans puces, sans numéros.
4. Respect strict de l'ordre des rubriques :
   Salutation → Culte précédent → Culte du jour → Conférence →
   District Abidjan Nord → Circuit Angré → Église locale.
5. N'inclus que les rubriques qui ont des données renseignées. N'invente aucune information.
6. Formules consacrées à utiliser :
   - « Que Dieu bénisse chaque main qui a donné » (après les offrandes)
   - « Que la grâce et la paix du Saint-Esprit reposent sur chacun de vous »
   - « Bien-aimés dans le Seigneur, chers frères et sœurs »
7. Pour les courriers : utilise le résumé validé s'il existe, sinon résume toi-même
   le contenu brut en 2-3 phrases.
8. Pour les événements : annonce la date, l'heure, le lieu et les consignes
   de façon naturelle et fluide.
9. Termine chaque grande rubrique par une transition naturelle vers la suivante.
10. Le ton doit être solennel mais chaleureux, comme un annonceur d'église
    expérimenté qui parle à sa communauté.`

export async function POST(request: Request) {
  const { unauthorized } = await requireAuth()
  if (unauthorized) return unauthorizedResponse()

  try {
    // Instanciation à la requête : évite de lever au chargement du module
    // (build Next) si ANTHROPIC_API_KEY n'est pas définie.
    const client = new Anthropic()

    const body = await request.json().catch(() => ({}))
    const { annonce_id } = body as { annonce_id?: string }

    if (!annonce_id) {
      return Response.json({ error: 'annonce_id manquant' }, { status: 400 })
    }

    const { data: annonce, error } = await getAnnonceAvecCulte(annonce_id)
    if (error || !annonce) {
      return Response.json({ error: error ?? 'Annonce introuvable' }, { status: 404 })
    }

    const userPrompt = buildAnnoncePrompt(annonce.cultes, annonce.rubriques_annonce)

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const block = response.content[0]
    const texte = block?.type === 'text' ? block.text : ''
    if (!texte) {
      return Response.json({ error: 'Réponse vide du modèle' }, { status: 502 })
    }

    // Sauvegarde best-effort du texte généré sur l'annonce
    await sauvegarderTexte(annonce_id, texte).catch(() => undefined)

    const tokens = response.usage.input_tokens + response.usage.output_tokens
    return Response.json({ texte, tokens_utilises: tokens })
  } catch (err) {
    console.error('[/api/annonces/generer-complet]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}

async function sauvegarderTexte(annonceId: string, texte: string): Promise<void> {
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
  await (db as any).from('annonces').update({ texte_genere: texte }).eq('id', annonceId)
}
