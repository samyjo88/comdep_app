import Anthropic from '@anthropic-ai/sdk'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'

const SYSTEM_PROMPT =
  'Résume ce courrier d\'église en 3-4 phrases maximum, en français soutenu, ' +
  'de façon neutre et informative. Ne commence pas par « Ce courrier » ou ' +
  '« Le courrier ». Commence directement par le contenu résumé. ' +
  'Réponds uniquement avec le résumé, sans préambule ni mise en forme.'

export async function POST(request: Request) {
  const { unauthorized } = await requireAuth()
  if (unauthorized) return unauthorizedResponse()

  try {
    // Instanciation à la requête : évite de lever au chargement du module
    // (build Next) si ANTHROPIC_API_KEY n'est pas définie.
    const client = new Anthropic()

    const body = await request.json().catch(() => ({}))
    const { contenu, objet } = body as { contenu?: string; objet?: string }

    if (!contenu?.trim()) {
      return Response.json({ error: 'contenu manquant' }, { status: 400 })
    }

    const message = objet
      ? `Objet du courrier : ${objet}\n\nContenu :\n${contenu}`
      : contenu

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message }],
    })

    const block = response.content[0]
    const resume = block?.type === 'text' ? block.text.trim() : ''
    if (!resume) {
      return Response.json({ error: 'Réponse vide du modèle' }, { status: 502 })
    }

    return Response.json({ resume })
  } catch (err) {
    console.error('[/api/annonces/resumer-courrier]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}
