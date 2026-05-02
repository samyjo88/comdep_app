import { renderToBuffer } from '@react-pdf/renderer'
import { createElement, type ReactElement } from 'react'
import { createClient } from '@supabase/supabase-js'
import AnnoncePDF from '@/components/annonces/AnnoncePDF'
import type { Culte, RubriqueAnnonce } from '@/types/annonces'
import type { DocumentProps } from '@react-pdf/renderer'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { annonce_id } = body as { annonce_id?: string }

  if (!annonce_id) {
    return Response.json({ error: 'annonce_id requis' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('annonces')
    .select('*, cultes(*), rubriques_annonce(*)')
    .eq('id', annonce_id)
    .single()

  if (error || !data) {
    return Response.json({ error: 'Annonce introuvable' }, { status: 404 })
  }

  const culte     = data.cultes as Culte
  const rubriques = ([...data.rubriques_annonce] as RubriqueAnnonce[])
    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
  const nomEglise = process.env.NEXT_PUBLIC_NOM_EGLISE ?? 'Notre Église'

  const element = createElement(AnnoncePDF, { culte, rubriques, nomEglise }) as ReactElement<DocumentProps>
  const buffer  = await renderToBuffer(element)
  const bytes   = new Uint8Array(buffer)
  const filename = `Annonces_${culte.date_culte}.pdf`

  return new Response(bytes, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(bytes.length),
    },
  })
}
