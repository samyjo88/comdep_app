import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;')
}

function formatDateLongue(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const MOMENT_LABELS: Record<string, string> = {
  adoration:  'Adoration',
  louange:    'Louange',
  offertoire: 'Offertoire',
  communion:  'Communion',
  envoi:      'Envoi',
  special:    'Spécial',
}

function getMomentLabel(val: string | null): string {
  if (!val) return '—'
  return MOMENT_LABELS[val] ?? val
}

function firstFourLines(paroles: string | null): string[] {
  if (!paroles?.trim()) return []
  const sectionRe = /^(refrain|couplet|verset|pont|bridge|intro|outro|interlude|chorus|verse)\s*\d*\s*:?$/i
  return paroles
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !sectionRe.test(l))
    .slice(0, 4)
}

// ── HTML generator ───────────────────────────────────────────────────────────

function generateHTML(setlist: Row): string {
  const culte = setlist.cultes
  const items: Row[] = [...(setlist.setlist_items ?? [])]
    .sort((a, b) => (a.position as number) - (b.position as number))

  const dateLabel = culte?.date_culte
    ? capitalize(formatDateLongue(culte.date_culte as string))
    : (setlist.titre_setlist ?? 'Setlist')

  const hasNotes   = items.some(i => i.notes_operateur)
  const hasParoles = items.some(i => i.cantiques?.paroles?.trim())

  const colCount = hasNotes ? 6 : 5

  const tableRows = items.map((item, idx) => {
    const c     = item.cantiques ?? {}
    const isGad = c.categorie === 'gad'
    const titre = escapeHtml(c.titre ?? '')
    const ref   = isGad
      ? (c.numero_gad ? ` (GAD ${escapeHtml(c.numero_gad)})` : '')
      : ' <span class="chorale-label">(Chorale)</span>'
    const cat      = isGad ? '📘&nbsp;GAD' : '🎤&nbsp;Chorale'
    const tonalite = escapeHtml(item.tonalite_utilisee ?? c.tonalite ?? '—')
    const moment   = escapeHtml(getMomentLabel(item.moment_culte))
    const notes    = escapeHtml(item.notes_operateur ?? '')

    return `
    <tr>
      <td class="num">${idx + 1}</td>
      <td>${titre}${ref}</td>
      <td>${cat}</td>
      <td class="mono">${tonalite}</td>
      <td>${moment}</td>
      ${hasNotes ? `<td class="notes">${notes}</td>` : ''}
    </tr>`
  }).join('')

  const parolesSection = hasParoles ? `
    <div class="paroles-section">
      <hr class="sep">
      <h2 class="section-title">Paroles rapides (aide-mémoire)</h2>
      ${items.map((item, idx) => {
        const lines = firstFourLines(item.cantiques?.paroles)
        if (!lines.length) return ''
        const titre = escapeHtml(item.cantiques?.titre ?? '')
        const moreLines = (item.cantiques?.paroles ?? '').split(/\r?\n/).filter((l: string) => l.trim()).length
        const hasMore   = moreLines > 4
        return `
        <div class="paroles-item">
          <h3>${idx + 1}. ${titre}</h3>
          ${lines.map(l => `<p>${escapeHtml(l)}</p>`).join('')}
          ${hasMore ? '<p class="ellipsis">…</p>' : ''}
        </div>`
      }).join('')}
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Setlist – ${escapeHtml(dateLabel)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Georgia, "Times New Roman", Times, serif;
      font-size: 12pt;
      color: #111;
      background: #fff;
      padding: 2cm;
      max-width: 21cm;
      margin: 0 auto;
      line-height: 1.5;
    }

    /* ── Header ── */
    .doc-title {
      text-align: center;
      font-size: 20pt;
      font-weight: bold;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 0.5em;
    }
    .doc-meta {
      text-align: center;
      font-size: 11pt;
      line-height: 1.8;
      border-bottom: 2px solid #111;
      padding-bottom: 0.8em;
      margin-bottom: 1.4em;
    }
    .doc-meta .date   { font-weight: bold; font-size: 12pt; }
    .doc-meta .theme  { font-style: italic; color: #444; }
    .doc-meta .pred   { color: #333; }

    /* ── Table ── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin-bottom: 0.5em;
    }
    th, td {
      border: 1px solid #444;
      padding: 5pt 7pt;
      text-align: left;
      vertical-align: top;
    }
    thead th { background: #ebebeb; font-weight: bold; }
    thead     { display: table-header-group; }
    tr        { page-break-inside: avoid; }

    td.num   { text-align: center; width: 2em; font-variant-numeric: tabular-nums; }
    td.mono  { font-family: "Courier New", monospace; }
    td.notes { font-style: italic; color: #555; }
    .chorale-label { font-style: italic; color: #8b5e1a; font-size: 9pt; }

    /* ── Paroles ── */
    .sep { border: none; border-top: 1px solid #999; margin: 1.5em 0 1em; }
    .section-title {
      font-size: 11pt;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.8em;
    }
    .paroles-section { margin-top: 1.5em; }
    .paroles-item {
      page-break-inside: avoid;
      margin-bottom: 1em;
      padding-bottom: 0.8em;
      border-bottom: 1px dotted #ccc;
    }
    .paroles-item:last-child { border-bottom: none; }
    .paroles-item h3 { font-size: 11pt; font-weight: bold; margin-bottom: 0.25em; }
    .paroles-item p  { font-size: 10pt; color: #333; padding-left: 0.8em; }
    .paroles-item .ellipsis { color: #aaa; font-style: italic; }

    /* ── Print ── */
    @page { size: A4 portrait; margin: 2cm; }
    @media print {
      body { padding: 0; }
      @page { margin: 2cm; }
    }

    /* ── Screen preview ── */
    @media screen {
      body {
        background: #f5f5f5;
        padding: 3cm;
        box-shadow: 0 2px 16px rgba(0,0,0,0.12);
        margin: 1cm auto;
        border: 1px solid #ddd;
        border-radius: 2px;
      }
    }
  </style>
</head>
<body>

  <div class="doc-title">Setlist du culte</div>

  <div class="doc-meta">
    <div class="date">${escapeHtml(dateLabel)}</div>
    ${culte?.theme      ? `<div class="theme">${escapeHtml(culte.theme as string)}</div>`         : ''}
    ${culte?.predicateur ? `<div class="pred">Prédicateur : ${escapeHtml(culte.predicateur as string)}</div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:2em">#</th>
        <th>Cantique</th>
        <th style="width:6em">Catégorie</th>
        <th style="width:6em">Tonalité</th>
        <th style="width:7em">Moment</th>
        ${hasNotes ? '<th>Notes opérateur</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${items.length === 0
        ? `<tr><td colspan="${colCount}" style="text-align:center;padding:1em;font-style:italic;color:#666">Aucun cantique dans cette setlist.</td></tr>`
        : tableRows}
    </tbody>
  </table>

  ${parolesSection}

</body>
</html>`
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return new Response('Paramètre id manquant', { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createClient() as any

    const { data, error } = await supabase
      .from('setlists')
      .select(`
        id, titre_setlist, statut,
        cultes(date_culte, theme, predicateur),
        setlist_items(
          id, position, moment_culte, tonalite_utilisee, notes_operateur,
          cantiques(id, categorie, numero_gad, titre, tonalite, paroles)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return new Response('Setlist introuvable', { status: 404 })
    }

    const html      = generateHTML(data as Row)
    const culte     = (data as Row).cultes
    const datePart  = culte?.date_culte ? (culte.date_culte as string) : id
    const filename  = `setlist-${datePart}.html`

    return new Response(html, {
      headers: {
        'Content-Type':        'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (err) {
    console.error('[/api/projection/setlists/export-pdf]', err)
    return new Response('Erreur interne', { status: 500 })
  }
}
