import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { genererTexteRubrique, PROMPTS_SYSTEME } from '@/lib/generation'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'
import type { CodeRubrique } from '@/types/annonces'

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { unauthorized } = await requireAuth()
  if (unauthorized) return unauthorizedResponse()

  try {
    const body = await request.json()
    const { rubriqueId, codeRubrique, donnees, annoncePrecedente } = body as {
      rubriqueId:        string
      codeRubrique:      CodeRubrique
      donnees:           unknown
      annoncePrecedente?: string | null
    }

    if (!rubriqueId || !codeRubrique || donnees === undefined) {
      return Response.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    if (!PROMPTS_SYSTEME[codeRubrique]) {
      return Response.json({ error: `Rubrique inconnue : ${codeRubrique}` }, { status: 400 })
    }

    const { texte, tokens } = await genererTexteRubrique(codeRubrique, donnees, annoncePrecedente)

    // Log best-effort (non-bloquant)
    logGeneration(rubriqueId, donnees, texte, tokens).catch(() => undefined)

    return Response.json({ texte_genere: texte, tokens_utilises: tokens })
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
  donnees: unknown,
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
      prompt_envoye:   JSON.stringify(donnees),
      texte_recu:      texteRecu,
      tokens_utilises: tokensUtilises,
    })
  } catch {
    // Log failure is non-fatal
  }
}
