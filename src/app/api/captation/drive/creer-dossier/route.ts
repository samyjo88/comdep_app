import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { creerDossierDriveCulte } from '@/lib/captation-drive'

export const dynamic = 'force-dynamic'

// ── Auth session ───────────────────────────────────────────────────────────

async function verifierSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    return user !== null
  } catch {
    return false
  }
}

// ── POST /api/captation/drive/creer-dossier ────────────────────────────────

export async function POST(req: NextRequest) {
  // Vérification session
  if (!await verifierSession()) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  let culteId: string
  try {
    const body = await req.json() as { culte_id?: string }
    if (!body.culte_id) {
      return NextResponse.json({ error: 'culte_id requis' }, { status: 400 })
    }
    culteId = body.culte_id
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const r = await creerDossierDriveCulte(culteId)
  if (r.error) {
    return NextResponse.json({ error: r.error }, { status: r.status ?? 500 })
  }
  return NextResponse.json({ success: true, dossier: r.dossier })
}
