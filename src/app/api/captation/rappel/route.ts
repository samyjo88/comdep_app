import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import type { RoleCaptation } from '@/types/captation'

// ── Clients ────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY)

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || key === 'your-supabase-service-role-key') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY non configurée — voir .env.local')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateFr(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

const ROLE_CONFIG: Record<RoleCaptation, { label: string; icone: string; couleur: string; materiel: string[] }> = {
  cameraman: {
    label:   'Caméraman',
    icone:   '🎥',
    couleur: '#3b82f6',
    materiel: [
      'Caméra principale + batterie chargée',
      'Trépied et tête fluide',
      'Câble HDMI / SDI vers régie',
    ],
  },
  photographe: {
    label:   'Photographe',
    icone:   '📷',
    couleur: '#a855f7',
    materiel: [
      'Appareil photo + objectif adapté',
      'Cartes mémoire formatées',
      'Batterie(s) de rechange chargée(s)',
    ],
  },
  infographiste: {
    label:   'Infographiste',
    icone:   '🎨',
    couleur: '#f97316',
    materiel: [
      'Ordinateur portable + câble d\'alimentation',
      'Logiciel de présentation (ProPresenter / PowerPoint)',
      'Fichier de présentation du culte à jour',
    ],
  },
}

// ── Template HTML ──────────────────────────────────────────────────────────

function buildEmailHtml(opts: {
  prenom:   string
  role:     RoleCaptation
  dateFr:   string
  theme:    string | null
}): string {
  const { prenom, role, dateFr, theme } = opts
  const cfg  = ROLE_CONFIG[role]
  const date = dateFr.charAt(0).toUpperCase() + dateFr.slice(1)

  const materielRows = cfg.materiel
    .map(m => `<li style="margin:6px 0;font-size:14px;color:#3f3f46;">${m}</li>`)
    .join('')

  const themeBlock = theme
    ? `<tr>
        <td style="padding:7px 0;color:#71717a;font-size:13px;vertical-align:top;">🙏&nbsp;Thème</td>
        <td style="padding:7px 0;color:#18181b;font-size:14px;font-weight:600;">${theme}</td>
      </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rappel captation</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.10);">

        <!-- En-tête -->
        <tr>
          <td style="background:#18181b;padding:28px 32px;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">
              Département Captation
            </p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">
              🔔 Rappel de service
            </h1>
          </td>
        </tr>

        <!-- Corps -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:17px;color:#18181b;font-weight:600;">
              Bonjour ${prenom},
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.65;">
              Tu es assigné(e) pour assurer la captation du prochain culte. Voici un récapitulatif de ta mission :
            </p>

            <!-- Carte détails -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f9f9fb;border-radius:10px;border-left:4px solid ${cfg.couleur};margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding:7px 0;color:#71717a;font-size:13px;width:110px;vertical-align:top;">📅&nbsp;Date</td>
                    <td style="padding:7px 0;color:#18181b;font-size:14px;font-weight:600;">${date}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#71717a;font-size:13px;vertical-align:top;">🕘&nbsp;Heure</td>
                    <td style="padding:7px 0;color:#18181b;font-size:14px;font-weight:600;">9h00</td>
                  </tr>
                  ${themeBlock}
                  <tr>
                    <td style="padding:7px 0;color:#71717a;font-size:13px;vertical-align:middle;">${cfg.icone}&nbsp;Rôle</td>
                    <td style="padding:7px 0;vertical-align:middle;">
                      <span style="display:inline-block;background:${cfg.couleur};color:#ffffff;padding:4px 14px;border-radius:999px;font-size:13px;font-weight:700;">
                        ${cfg.label}
                      </span>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- Matériel -->
            <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#18181b;">
              📦 Matériel à prévoir
            </p>
            <ul style="margin:0 0 24px;padding-left:20px;">
              ${materielRows}
            </ul>

            <!-- Alerte -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
              <tr><td style="padding:14px 18px;">
                <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                  ⚠️ <strong>Empêchement ?</strong> Merci de prévenir le responsable dès que possible
                  afin qu'un remplaçant puisse être trouvé à temps.
                </p>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Pied de page -->
        <tr>
          <td style="padding:18px 32px;border-top:1px solid #f4f4f5;background:#fafafa;">
            <p style="margin:0;font-size:11px;color:#a1a1aa;line-height:1.6;">
              Cet email a été envoyé automatiquement par l'application de gestion du
              département communication. Merci de ne pas y répondre directement.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── POST /api/captation/rappel ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY non configurée' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  try {
    supabase = getSupabaseAdmin()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
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

  // 1. Culte
  const { data: culte, error: culteErr } = await supabase
    .from('cultes')
    .select('id, date_culte, theme')
    .eq('id', culteId)
    .single()

  if (culteErr || !culte) {
    return NextResponse.json({ error: 'Culte introuvable' }, { status: 404 })
  }

  // 2. Assignments avec membres
  const { data: assignments, error: assignErr } = await supabase
    .from('planning_captation')
    .select('role_du_jour, membres_captation(prenom, nom, email)')
    .eq('culte_id', culteId)

  if (assignErr) {
    return NextResponse.json({ error: assignErr.message }, { status: 500 })
  }

  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ envoyes: 0, erreurs: [], message: 'Aucun membre assigné à ce culte' })
  }

  const dateFr = formatDateFr(culte.date_culte)
  const envoyes: number[] = []
  const erreurs: string[] = []

  // 3. Envoi par membre
  for (const row of assignments as Array<{ role_du_jour: RoleCaptation; membres_captation: { prenom: string; nom: string; email: string | null } }>) {
    const membre = row.membres_captation
    if (!membre?.email) continue

    const { error: sendErr } = await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
      to:      membre.email,
      subject: `Rappel captation — ${dateFr}`,
      html:    buildEmailHtml({
        prenom: membre.prenom,
        role:   row.role_du_jour,
        dateFr,
        theme:  culte.theme ?? null,
      }),
    })

    if (sendErr) {
      erreurs.push(`${membre.prenom} ${membre.nom} : ${sendErr.message}`)
    } else {
      envoyes.push(1)
    }
  }

  return NextResponse.json({ envoyes: envoyes.length, erreurs })
}
