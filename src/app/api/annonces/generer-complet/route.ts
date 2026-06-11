import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getAnnonceAvecCulte } from '@/lib/annonces'
import { buildAnnoncePrompt } from '@/lib/annonce-prompt-builder'
import { genererAnnonceComplete } from '@/lib/generation'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'

export async function POST(request: Request) {
  const { unauthorized } = await requireAuth()
  if (unauthorized) return unauthorizedResponse()

  try {
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
    const { texte, tokens } = await genererAnnonceComplete(userPrompt)

    if (!texte) {
      return Response.json({ error: 'Réponse vide du modèle' }, { status: 502 })
    }

    // Sauvegarde best-effort du texte généré sur l'annonce
    await sauvegarderTexte(annonce_id, texte).catch(() => undefined)

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
