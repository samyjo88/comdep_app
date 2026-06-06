import { createClient } from '@supabase/supabase-js'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'
import type { Culte, RubriqueAnnonce } from '@/types/annonces'

const LABELS: Record<string, string> = {
  salutation:      'Salutation',
  culte_precedent: 'Culte précédent',
  culte_jour:      'Culte du jour',
  conference:      'Conférence',
  district:        'District',
  circuit:         'Circuit',
  eglise_local:    'Église locale',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  return d.charAt(0).toUpperCase() + d.slice(1)
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

function buildWordHtml(culte: Culte, rubriques: RubriqueAnnonce[], nomEglise: string): string {
  const dateFormatee = formatDate(culte.date_culte)
  const rubriquesHtml = rubriques.map(r => {
    const label = LABELS[r.code_rubrique] ?? r.code_rubrique
    const contenu = r.texte_final
      ? `<p style="font-size:11pt;line-height:1.6;color:#333333;">${escapeHtml(r.texte_final)}</p>`
      : `<p style="font-size:10pt;color:#AAAAAA;font-style:italic;">— Rubrique non complétée —</p>`
    return `
      <div style="margin-bottom:16pt;">
        <p style="font-size:9pt;font-weight:bold;text-transform:uppercase;color:#1A3A5C;letter-spacing:1pt;border-bottom:0.5pt solid #D0D9E3;padding-bottom:3pt;margin-bottom:6pt;">
          ${escapeHtml(label)}
        </p>
        ${contenu}
      </div>`
  }).join('')

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <meta name=ProgId content=Word.Document>
      <meta name=Generator content="Microsoft Word 15">
      <title>Annonces du ${culte.date_culte}</title>
      <!--[if gte mso 9]>
      <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml>
      <![endif]-->
      <style>
        @page { margin: 2cm; size: A4; }
        body { font-family: Calibri, Arial, sans-serif; margin: 0; padding: 0; }
        h1 { font-size: 22pt; font-weight: bold; letter-spacing: 3pt; text-transform: uppercase; color: #1A3A5C; margin: 0 0 4pt 0; }
        .church-name { font-size: 9pt; letter-spacing: 2pt; text-transform: uppercase; color: #1A3A5C; }
        .date { font-size: 10pt; color: #555555; }
        .divider { border: none; border-top: 1.5pt solid #C4A44A; margin: 14pt 0; }
        .footer { font-size: 7pt; color: #999999; border-top: 0.5pt solid #D0D9E3; padding-top: 6pt; margin-top: 20pt; display: flex; justify-content: space-between; }
      </style>
    </head>
    <body>
      <div style="text-align:center;margin-bottom:4pt;">
        <p class="church-name">${escapeHtml(nomEglise)}</p>
        <h1>Annonces</h1>
        <p class="date">${dateFormatee}</p>
      </div>
      <hr class="divider">
      ${rubriquesHtml}
      <div class="footer">
        <span>Préparé par le Département Communication</span>
        <span>Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>
    </body>
    </html>`
}

export async function POST(request: Request) {
  const { unauthorized } = await requireAuth()
  if (unauthorized) return unauthorizedResponse()

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

  const html     = buildWordHtml(culte, rubriques, nomEglise)
  const bytes    = new TextEncoder().encode(html)
  const filename = `Annonces_${culte.date_culte}.doc`

  return new Response(bytes, {
    headers: {
      'Content-Type':        'application/msword',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(bytes.length),
    },
  })
}
