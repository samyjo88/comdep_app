import { createClient } from '@supabase/supabase-js'
import { genererTexteRubrique } from '@/lib/generation'
import type { CodeRubrique } from '@/types/annonces'

// ── Types SSE ─────────────────────────────────────────────────────────────────

export type SseEvent =
  | { type: 'start';    total: number }
  | { type: 'progress'; rubriqueId: string; code: string; index: number; total: number; succes: true;  texte: string; tokens: number }
  | { type: 'progress'; rubriqueId: string; code: string; index: number; total: number; succes: false; error: string }
  | { type: 'done';     total: number; succes: number; echecs: number }
  | { type: 'error';    message: string }

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { annonce_id } = body as { annonce_id?: string }

  if (!annonce_id) {
    return Response.json({ error: 'annonce_id manquant' }, { status: 400 })
  }

  // Service role — pas besoin de cookies (contexte SSE incompatible avec cookies())
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Récupérer les rubriques sans texte_final
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rubriques, error } = await (supabase as any)
    .from('rubriques_annonce')
    .select('*')
    .eq('annonce_id', annonce_id)
    .is('texte_final', null)
    .order('ordre', { ascending: true })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: SseEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      const total = (rubriques as unknown[]).length
      let succes = 0

      send({ type: 'start', total })

      for (let i = 0; i < total; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = (rubriques as any[])[i]
        try {
          let donnees: unknown = {}
          try { if (r.donnees_brutes) donnees = JSON.parse(r.donnees_brutes) } catch { /* */ }

          const { texte, tokens } = await genererTexteRubrique(
            r.code_rubrique as CodeRubrique,
            donnees,
          )

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('rubriques_annonce')
            .update({ texte_final: texte, valide: true })
            .eq('id', r.id)

          succes++
          send({
            type: 'progress', rubriqueId: r.id, code: r.code_rubrique,
            index: i + 1, total, succes: true, texte, tokens,
          })
        } catch (err) {
          send({
            type: 'progress', rubriqueId: r.id, code: r.code_rubrique,
            index: i + 1, total, succes: false,
            error: err instanceof Error ? err.message : 'Erreur inconnue',
          })
        }
      }

      send({ type: 'done', total, succes, echecs: total - succes })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
