import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// ── Clients ────────────────────────────────────────────────────────────────

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY non configurée')
  }
  return new Resend(process.env.RESEND_API_KEY)
}

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

// ── Helpers date ───────────────────────────────────────────────────────────

function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateFr(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── Template email ─────────────────────────────────────────────────────────

function buildEmailHtml(prenom: string, role: string, dateFr: string): string {
  const dateCapitalisee = dateFr.charAt(0).toUpperCase() + dateFr.slice(1)

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rappel service son</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.10);">

        <!-- En-tête -->
        <tr>
          <td style="background:#18181b;padding:28px 32px;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">
              Département Sonorisation
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
              Tu es assigné(e) pour assurer la sonorisation du culte de ce dimanche.
              Voici un récapitulatif de ta mission :
            </p>

            <!-- Carte détails -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f9f9fb;border-radius:10px;border-left:4px solid #6366f1;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding:7px 0;color:#71717a;font-size:13px;width:110px;vertical-align:top;">
                      📅&nbsp;Date
                    </td>
                    <td style="padding:7px 0;color:#18181b;font-size:14px;font-weight:600;">
                      ${dateCapitalisee}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#71717a;font-size:13px;vertical-align:top;">
                      🕘&nbsp;Heure
                    </td>
                    <td style="padding:7px 0;color:#18181b;font-size:14px;font-weight:600;">
                      9h00
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#71717a;font-size:13px;vertical-align:middle;">
                      🎚️&nbsp;Rôle
                    </td>
                    <td style="padding:7px 0;vertical-align:middle;">
                      <span style="display:inline-block;background:#6366f1;color:#ffffff;padding:4px 14px;border-radius:999px;font-size:13px;font-weight:700;">
                        ${role}
                      </span>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>

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

// ── Route GET ──────────────────────────────────────────────────────────────

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let resend: any
  try {
    resend = getResend()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
  const resend = new Resend(process.env.RESEND_API_KEY)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  try {
    supabase = getSupabaseAdmin()
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    )
  }

  // Fenêtre : aujourd'hui → dans 48h
  const now   = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const todayStr = dateToISO(now)
  const in48hStr = dateToISO(in48h)

  // Récupère les cultes dans la fenêtre (sauf ceux déjà passés manuellement)
  const { data: cultes, error: cultesErr } = await supabase
    .from('planning_son')
    .select('*')
    .gte('date_culte', todayStr)
    .lte('date_culte', in48hStr)
    .neq('statut', 'passe')

  if (cultesErr) {
    return NextResponse.json({ error: cultesErr.message }, { status: 500 })
  }

  if (!cultes || cultes.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'Aucun culte planifié dans les 48 prochaines heures.',
      sent: 0,
    })
  }

  // Envoie un email par membre assigné
  const envoyes: string[] = []
  const echecs: { destinataire: string; erreur: string }[] = []

  for (const culte of cultes) {
    const dateFr = formatDateFr(culte.date_culte)

    const roles: { id: number | null; label: string }[] = [
      { id: culte.responsable_id, label: 'Responsable' },
      { id: culte.assistant1_id,  label: 'Assistant 1' },
      { id: culte.assistant2_id,  label: 'Assistant 2' },
    ]

    for (const { id, label } of roles) {
      if (!id) continue

      const { data: membre } = await supabase
        .from('membres_son')
        .select('prenom, nom, email')
        .eq('id', id)
        .single()

      if (!membre?.email) continue

      const nomComplet = `${membre.prenom} ${membre.nom}`

      const { error: sendErr } = await resend.emails.send({
        from:    process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
        to:      membre.email,
        subject: `Rappel - Service son dimanche ${dateFr}`,
        html:    buildEmailHtml(membre.prenom, label, dateFr),
      })

      if (sendErr) {
        echecs.push({ destinataire: nomComplet, erreur: sendErr.message })
      } else {
        envoyes.push(`${nomComplet} (${label})`)
      }
    }
  }

  return NextResponse.json({
    success: true,
    cultes:       cultes.length,
    sent:         envoyes.length,
    destinataires: envoyes,
    ...(echecs.length > 0 && { echecs }),
  })
}
