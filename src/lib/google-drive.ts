import { google } from 'googleapis'
import type { drive_v3 } from 'googleapis'

// ── Auth ───────────────────────────────────────────────────────────────────

function initDriveClient(): drive_v3.Drive {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key   = process.env.GOOGLE_PRIVATE_KEY

  if (!email || !key) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL ou GOOGLE_PRIVATE_KEY non configurées'
    )
  }

  const auth = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive'],
  })

  return google.drive({ version: 'v3', auth })
}

function rootId(): string {
  const id = process.env.GOOGLE_DRIVE_DOSSIER_RACINE_ID
  if (!id) throw new Error('GOOGLE_DRIVE_DOSSIER_RACINE_ID non configurée')
  return id
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function creerDossier(
  drive:    drive_v3.Drive,
  nom:      string,
  parentId: string,
): Promise<string> {
  const { data } = await drive.files.create({
    requestBody: {
      name:     nom,
      mimeType: 'application/vnd.google-apps.folder',
      parents:  [parentId],
    },
    fields: 'id',
  })
  if (!data.id) throw new Error(`Impossible de créer le dossier "${nom}"`)
  return data.id
}

async function rendrePublic(drive: drive_v3.Drive, fileId: string): Promise<void> {
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  })
}

function lienDrive(id: string): string {
  return `https://drive.google.com/drive/folders/${id}`
}

// ── createDossierCulte ─────────────────────────────────────────────────────

export interface DossierCulteResult {
  idDossierPrincipal: string
  idVideos:           string
  idPhotos:           string
  idInfographie:      string
  liens: {
    principal:  string
    videos:     string
    photos:     string
    infographie: string
  }
}

export async function createDossierCulte(dateCulte: string): Promise<DossierCulteResult> {
  const drive = initDriveClient()
  const nom   = `Culte_${dateCulte}`

  const idPrincipal  = await creerDossier(drive, nom,          rootId())
  const idVideos     = await creerDossier(drive, 'Videos',     idPrincipal)
  const idPhotos     = await creerDossier(drive, 'Photos',     idPrincipal)
  const idInfographie = await creerDossier(drive, 'Infographie', idPrincipal)

  await Promise.all([
    rendrePublic(drive, idPrincipal),
    rendrePublic(drive, idVideos),
    rendrePublic(drive, idPhotos),
    rendrePublic(drive, idInfographie),
  ])

  return {
    idDossierPrincipal: idPrincipal,
    idVideos,
    idPhotos,
    idInfographie,
    liens: {
      principal:   lienDrive(idPrincipal),
      videos:      lienDrive(idVideos),
      photos:      lienDrive(idPhotos),
      infographie: lienDrive(idInfographie),
    },
  }
}

// ── getDossierInfo ─────────────────────────────────────────────────────────

export interface DossierInfo {
  nom:          string
  lien:         string
  nbFichiers:   number
  tailleOctets: number
  modifie:      string
}

export async function getDossierInfo(dossierDriveId: string): Promise<DossierInfo> {
  const drive = initDriveClient()

  const { data: meta } = await drive.files.get({
    fileId: dossierDriveId,
    fields: 'id, name, modifiedTime',
  })

  const { data: children } = await drive.files.list({
    q:        `'${dossierDriveId}' in parents and trashed = false`,
    fields:   'files(size)',
    pageSize: 1000,
  })

  const fichiers    = children.files ?? []
  const nbFichiers  = fichiers.length
  const tailleOctets = fichiers.reduce((acc, f) => acc + Number(f.size ?? 0), 0)

  return {
    nom:          meta.name  ?? dossierDriveId,
    lien:         lienDrive(dossierDriveId),
    nbFichiers,
    tailleOctets,
    modifie:      meta.modifiedTime ?? new Date().toISOString(),
  }
}

// ── listerFichiers ─────────────────────────────────────────────────────────

export interface FichierDrive {
  id:         string
  nom:        string
  type:       string
  taille:     number
  lien:       string
  miniature?: string
  modifie:    string
}

export async function listerFichiers(dossierDriveId: string): Promise<FichierDrive[]> {
  const drive = initDriveClient()

  const { data } = await drive.files.list({
    q:       `'${dossierDriveId}' in parents and trashed = false`,
    fields:  'files(id, name, mimeType, size, webViewLink, thumbnailLink, modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: 50,
  })

  return (data.files ?? []).map(f => ({
    id:        f.id          ?? '',
    nom:       f.name        ?? '',
    type:      f.mimeType    ?? '',
    taille:    Number(f.size ?? 0),
    lien:      f.webViewLink ?? lienDrive(f.id ?? ''),
    miniature: f.thumbnailLink ?? undefined,
    modifie:   f.modifiedTime  ?? '',
  }))
}

// ── calculerEspaceTotal ────────────────────────────────────────────────────

export async function calculerEspaceTotal(dossierDriveId: string): Promise<number> {
  const drive = initDriveClient()

  async function sommeDossier(folderId: string): Promise<number> {
    const { data } = await drive.files.list({
      q:        `'${folderId}' in parents and trashed = false`,
      fields:   'files(id, size, mimeType)',
      pageSize: 1000,
    })

    const fichiers = data.files ?? []
    let total = 0

    for (const f of fichiers) {
      if (f.mimeType === 'application/vnd.google-apps.folder' && f.id) {
        total += await sommeDossier(f.id)
      } else {
        total += Number(f.size ?? 0)
      }
    }

    return total
  }

  const octets = await sommeDossier(dossierDriveId)
  return Math.round((octets / (1024 * 1024)) * 100) / 100
}
