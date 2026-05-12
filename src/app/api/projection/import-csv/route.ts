import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'

// ── CSV helpers ────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else { inQuotes = !inQuotes }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#'))

  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase())
  const rows    = lines.slice(1).map(parseCSVLine)
  return { headers, rows }
}

function parseArray(val: string): string[] | null {
  const parts = val.split('|').map(s => s.trim()).filter(Boolean)
  return parts.length > 0 ? parts : null
}

const VALID_CATEGORIES = new Set(['gad', 'chorale'])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCantique(headers: string[], row: string[], defaultCategorie: string): { data?: Record<string, any>; error?: string } {
  const get = (col: string) => {
    const idx = headers.indexOf(col)
    return idx >= 0 ? (row[idx] ?? '').trim() : ''
  }

  const categorie = get('categorie') || defaultCategorie
  if (!VALID_CATEGORIES.has(categorie)) {
    return { error: `Catégorie invalide : "${categorie}"` }
  }

  const titre = get('titre')
  if (!titre) return { error: 'Titre manquant' }

  return {
    data: {
      categorie,
      titre,
      numero_gad:         categorie === 'gad' ? (get('numero_gad') || null) : null,
      auteur_compositeur: get('auteur_compositeur') || null,
      tonalite:           get('tonalite')           || null,
      tempo:              categorie === 'gad'    ? (get('tempo')      || null) : null,
      difficulte:         categorie === 'chorale' ? (get('difficulte') || null) : null,
      themes:             parseArray(get('themes')),
      moment_culte:       parseArray(get('moment_culte')),
      paroles:            get('paroles') || null,
      notes:              get('notes')   || null,
      actif:              true,
    },
  }
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { unauthorized } = await requireAuth()
  if (unauthorized) return unauthorizedResponse()

  try {
    const { csv, defaultCategorie = 'gad' } = (await request.json()) as {
      csv:               string
      defaultCategorie?: string
    }

    if (!csv?.trim()) {
      return Response.json({ error: 'CSV vide' }, { status: 400 })
    }

    const { headers, rows } = parseCSV(csv)
    if (headers.length === 0) {
      return Response.json({ error: 'CSV invalide — vérifiez les en-têtes' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toInsert: Record<string, any>[] = []
    const errors: { line: number; message: string }[] = []

    rows.forEach((row, i) => {
      const result = rowToCantique(headers, row, defaultCategorie)
      if (result.error) {
        errors.push({ line: i + 2, message: result.error })
      } else if (result.data) {
        toInsert.push(result.data)
      }
    })

    let imported = 0
    if (toInsert.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = await createClient() as any
      const { error } = await supabase.from('cantiques').insert(toInsert)
      if (error) {
        return Response.json({ error: error.message }, { status: 500 })
      }
      imported = toInsert.length
      revalidatePath('/projection/cantiques')
    }

    return Response.json({ imported, errors })
  } catch (err) {
    console.error('[/api/projection/import-csv]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}
