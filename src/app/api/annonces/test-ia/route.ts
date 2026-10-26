import Anthropic from '@anthropic-ai/sdk'
import { testerConnexionClaude } from '@/lib/generation'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'

// Vérifie que la clé ANTHROPIC_API_KEY est configurée et que Claude répond
export async function GET() {
  const { unauthorized } = await requireAuth()
  if (unauthorized) return unauthorizedResponse()

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { ok: false, error: 'ANTHROPIC_API_KEY absente de cet environnement' },
      { status: 500 },
    )
  }

  try {
    const { modele, reponse } = await testerConnexionClaude()
    return Response.json({ ok: true, modele, reponse })
  } catch (err) {
    console.error('[/api/annonces/test-ia]', err)
    const status = err instanceof Anthropic.APIError ? err.status ?? 500 : 500
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erreur interne' },
      { status },
    )
  }
}
