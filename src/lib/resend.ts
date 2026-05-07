/**
 * Utilitaires d'envoi d'e-mails via Resend.
 * À n'utiliser que côté serveur (API routes, cron).
 */
import { Resend } from 'resend'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key || key === 're_...') {
    throw new Error('RESEND_API_KEY non configurée — voir .env.local')
  }
  return new Resend(key)
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
}

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// ── Template HTML ───────────────────────────────────────────────────────────

function buildHtml(sujet: string, message: string, lien: string | null): string {
  const appUrl  = getAppUrl()
  const fullUrl = lien ? (lien.startsWith('http') ? lien : `${appUrl}${lien}`) : null

  const ctaBlock = fullUrl ? `
    <tr>
      <td style="padding:0 32px 32px;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#2563eb; border-radius:6px;">
              <a href="${fullUrl}"
                 style="display:inline-block; padding:12px 24px; font-size:14px; font-weight:600;
                        color:#ffffff; text-decoration:none; letter-spacing:0.1px;">
                Voir dans l'application →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : ''

  // Escape HTML in user-supplied strings to prevent injection
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(sujet)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#f1f5f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;
                      overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

          <!-- ── En-tête ── -->
          <tr>
            <td style="background:#0f172a;padding:20px 32px;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <div style="width:36px;height:36px;background:#2563eb;border-radius:8px;
                                text-align:center;line-height:36px;font-size:13px;font-weight:900;
                                color:#ffffff;letter-spacing:-0.5px;">CD</div>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="color:#f8fafc;font-size:15px;font-weight:700;
                                 letter-spacing:-0.2px;">
                      ComDept – Département Communication
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Corps ── -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <h2 style="margin:0 0 16px;font-size:19px;font-weight:700;
                         color:#0f172a;line-height:1.35;">
                ${esc(sujet)}
              </h2>
              <p style="margin:0;font-size:15px;line-height:1.65;color:#374151;">
                ${esc(message).replace(/\n/g, '<br>')}
              </p>
            </td>
          </tr>

          <!-- ── CTA ── -->
          ${ctaBlock}

          <!-- ── Pied de page ── -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                Vous recevez cet e-mail car vous êtes membre du Département Communication.<br>
                Ce message est envoyé automatiquement — merci de ne pas y répondre.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Envoi interne vers une adresse connue ────────────────────────────────────

async function sendEmailTo(
  to: string,
  sujet: string,
  message: string,
  lien: string | null,
): Promise<void> {
  const resend = getResendClient()
  await resend.emails.send({
    from:    getFromEmail(),
    to,
    subject: sujet,
    html:    buildHtml(sujet, message, lien),
  })
}

// ── API publique ─────────────────────────────────────────────────────────────

/**
 * Envoie un e-mail à un membre identifié par son user_id (UUID auth.users).
 * Récupère l'e-mail depuis la table `profiles`.
 *
 * @returns true si envoyé, false si l'e-mail n'a pas pu être résolu ou si
 *          RESEND_API_KEY n'est pas configurée (dev local).
 */
export async function sendNotificationEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  sujet: string,
  message: string,
  lien: string | null,
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle() as { data: AnyRow | null }

  const email = profile?.email as string | undefined
  if (!email) return false

  try {
    await sendEmailTo(email, sujet, message, lien)
    return true
  } catch {
    // Ne jamais bloquer le cron pour un échec d'envoi d'e-mail
    return false
  }
}

/**
 * Envoie un e-mail de notification à une liste d'adresses e-mail connues.
 * Utilisé par les crons lorsque les e-mails sont déjà résolus.
 *
 * @returns { sent, failed } — le cron continue même en cas d'échec partiel.
 */
export async function sendNotificationEmails(
  toEmails: string[],
  sujet: string,
  message: string,
  lien: string | null,
): Promise<{ sent: number; failed: number }> {
  if (toEmails.length === 0) return { sent: 0, failed: 0 }

  const results = await Promise.allSettled(
    toEmails.map(email => sendEmailTo(email, sujet, message, lien))
  )

  const sent   = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  return { sent, failed }
}
