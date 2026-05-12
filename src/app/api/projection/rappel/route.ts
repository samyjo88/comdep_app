import { createClient }           from '@/lib/supabase/server'
import { sendNotificationEmails }  from '@/lib/resend'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export async function POST(request: Request) {
  try {
    const body     = await request.json() as { culte_id?: string }
    const culteId  = body.culte_id

    if (!culteId) {
      return Response.json({ error: 'culte_id manquant' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createClient() as any

    const { data: culte, error: culteErr } = await supabase
      .from('cultes')
      .select(`
        id, date_culte, theme, predicateur,
        planning_projection(
          id, role_du_jour, statut,
          membres_projection(id, prenom, nom, email)
        ),
        setlists(id, statut, titre_setlist)
      `)
      .eq('id', culteId)
      .single()

    if (culteErr || !culte) {
      return Response.json({ error: 'Culte introuvable' }, { status: 404 })
    }

    const culteRow = culte as Row
    const dateLabel = capitalize(formatDateLong(culteRow.date_culte as string))
    const planning  = (culteRow.planning_projection ?? []) as Row[]
    const setlist   = (culteRow.setlists as Row[])?.[0] ?? null

    const setlistInfo = setlist
      ? `\nSetlist : ${setlist.statut === 'valide' ? '✓ Validée' : 'En cours'}`
      : '\nSetlist : Aucune setlist pour ce culte.'

    const emails: string[] = []

    for (const entry of planning) {
      const membre = entry.membres_projection as Row | null
      if (!membre?.email) continue

      const roleLabel = entry.role_du_jour === 'diffusion' ? 'Diffusion' : 'Proclaim'
      const statutLabel = entry.statut === 'confirme' ? 'Confirmé'
        : entry.statut === 'present' ? 'Présent'
        : 'Planifié'

      const message = [
        `Bonjour ${membre.prenom},`,
        '',
        `Vous êtes assigné(e) comme opérateur ${roleLabel} pour le culte du :`,
        `📅 ${dateLabel}`,
        culteRow.theme      ? `📖 Thème : ${culteRow.theme}` : null,
        culteRow.predicateur ? `🎙 Prédicateur : ${culteRow.predicateur}` : null,
        setlistInfo,
        '',
        `Statut actuel : ${statutLabel}`,
        '',
        'Merci de confirmer votre présence dans l\'application si ce n\'est pas encore fait.',
        '',
        'À dimanche !',
      ].filter(l => l !== null).join('\n')

      emails.push(membre.email as string)

      await sendNotificationEmails(
        [membre.email as string],
        `Rappel – Culte du ${dateLabel}`,
        message,
        '/projection/planning',
      )
    }

    return Response.json({ sent: emails.length })
  } catch (err) {
    console.error('[/api/projection/rappel]', err)
    return Response.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
