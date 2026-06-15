import { resumerCourrier } from '@/lib/generation'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'

export async function POST(request: Request) {
  const { unauthorized } = await requireAuth()
  if (unauthorized) return unauthorizedResponse()

  try {
    const body = await request.json().catch(() => ({}))
    const { contenu, objet } = body as { contenu?: string; objet?: string }

    if (!contenu?.trim()) {
      return Response.json({ error: 'contenu manquant' }, { status: 400 })
    }

    const { resume } = await resumerCourrier(contenu, objet)
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
