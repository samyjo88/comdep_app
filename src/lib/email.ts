/**
 * Normalise un email pour stockage et comparaison.
 * Supabase Auth stocke les emails en minuscules : les tables membres_*
 * doivent suivre la même convention pour que la correspondance fonctionne.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Motif ILIKE pour une correspondance exacte insensible à la casse
 * (échappe les jokers %, _ et \ pour les emails legacy en casse mixte).
 */
export function emailIlikePattern(email: string): string {
  return email.trim().replace(/[\\%_]/g, (c) => `\\${c}`)
}
