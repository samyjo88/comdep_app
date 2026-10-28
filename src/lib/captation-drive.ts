import { createAdminClient } from '@/lib/supabase/admin'
import { createDossierCulte, driveConfigure } from '@/lib/google-drive'
import type { DossierDrive } from '@/types/captation'

// ── Normalisation erreurs Drive ────────────────────────────────────────────

export function driveErreur(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('invalid_grant') || msg.includes('token') || msg.includes('JWT')) {
    return 'Impossible de contacter Google Drive. Le token de service est expiré ou invalide — vérifiez GOOGLE_PRIVATE_KEY.'
  }
  if (msg.includes('quota') || msg.includes('429') || msg.includes('rateLimitExceeded')) {
    return 'Impossible de contacter Google Drive. Quota API dépassé — réessayez dans quelques minutes.'
  }
  if (msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('network')) {
    return 'Impossible de contacter Google Drive. Problème réseau — vérifiez la connectivité.'
  }
  if (msg.includes('permission') || msg.includes('403') || msg.includes('forbidden')) {
    return 'Impossible de contacter Google Drive. Permission refusée — partagez le dossier racine avec le compte de service.'
  }
  if (msg.includes('GOOGLE_SERVICE_ACCOUNT') || msg.includes('GOOGLE_PRIVATE_KEY') || msg.includes('non configurée')) {
    return 'Impossible de contacter Google Drive. Vérifiez la configuration (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_DRIVE_DOSSIER_RACINE_ID).'
  }
  return `Impossible de contacter Google Drive. ${msg}`
}

// ── creerDossierDriveCulte ─────────────────────────────────────────────────

/**
 * Crée (ou recrée) le dossier Drive du culte — Photos + Vidéos — et
 * l'enregistre dans `dossiers_drive`.
 */
export async function creerDossierDriveCulte(
  culteId: string,
): Promise<{ dossier?: DossierDrive; error?: string; status?: number }> {
  const db = createAdminClient()

  const { data: culte } = await db
    .from('cultes')
    .select('id, date_culte')
    .eq('id', culteId)
    .maybeSingle()
  if (!culte) return { error: 'Culte introuvable', status: 404 }

  let dossier
  try {
    dossier = await createDossierCulte(culte.date_culte as string)
  } catch (e) {
    return { error: driveErreur(e), status: 502 }
  }

  const { data: saved, error } = await db
    .from('dossiers_drive')
    .upsert(
      {
        culte_id:               culteId,
        id_dossier_drive:       dossier.idDossierPrincipal,
        lien_dossier_principal: dossier.liens.principal,
        lien_videos:            dossier.liens.videos,
        lien_photos:            dossier.liens.photos,
        lien_infographie:       null,
      },
      { onConflict: 'culte_id' },
    )
    .select()
    .single()

  if (error) {
    return { error: `Drive créé mais erreur Supabase : ${error.message}`, status: 500 }
  }
  return { dossier: saved as DossierDrive }
}

/**
 * Appelé à la création d'un culte : crée son dossier Drive s'il n'en a pas
 * encore. Sans effet si Drive n'est pas configuré ; une erreur Drive ne
 * bloque jamais la création du culte (le bouton « Créer le dossier Drive »
 * de la fiche captation reste disponible).
 */
export async function assurerDossierDriveCulte(culteId: string): Promise<string | null> {
  if (!driveConfigure()) return null
  const db = createAdminClient()
  const { data: existant } = await db
    .from('dossiers_drive')
    .select('id')
    .eq('culte_id', culteId)
    .maybeSingle()
  if (existant) return null

  const r = await creerDossierDriveCulte(culteId)
  if (r.error) console.error(`[drive] culte ${culteId} :`, r.error)
  return r.error ?? null
}
