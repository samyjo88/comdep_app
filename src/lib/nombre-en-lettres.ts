// Conversion des nombres en toutes lettres (français standard).
// Utilisé pour les montants d'offrandes et les effectifs dans les annonces
// lues à voix haute : 101325 → « cent un mille trois cent vingt-cinq ».

const UNITES = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
]

const DIZAINES = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']

function moinsDeCent(n: number): string {
  if (n < 20) return UNITES[n]
  if (n < 70) {
    const d = Math.floor(n / 10)
    const u = n % 10
    if (u === 0) return DIZAINES[d]
    if (u === 1) return `${DIZAINES[d]} et un`
    return `${DIZAINES[d]}-${UNITES[u]}`
  }
  if (n < 80) {
    if (n === 71) return 'soixante et onze'
    return `soixante-${UNITES[n - 60]}`
  }
  if (n === 80) return 'quatre-vingts'
  return `quatre-vingt-${UNITES[n - 80]}`
}

function moinsDeMille(n: number): string {
  const c = Math.floor(n / 100)
  const r = n % 100
  if (c === 0) return moinsDeCent(r)
  const cent = c === 1 ? 'cent' : `${UNITES[c]} cent${r === 0 ? 's' : ''}`
  return r === 0 ? cent : `${cent} ${moinsDeCent(r)}`
}

// « quatre-vingts » et « deux cents » perdent leur s devant « mille »
function sansAccordFinal(s: string): string {
  return s.replace(/(vingts|cents)$/, (m) => m.slice(0, -1))
}

export function nombreEnLettres(n: number): string {
  if (!Number.isFinite(n)) return ''
  n = Math.floor(Math.abs(n))
  if (n === 0) return 'zéro'

  const parts: string[] = []
  const milliards = Math.floor(n / 1_000_000_000)
  const millions  = Math.floor(n / 1_000_000) % 1000
  const milliers  = Math.floor(n / 1000) % 1000
  const reste     = n % 1000

  if (milliards) parts.push(milliards === 1 ? 'un milliard' : `${moinsDeMille(milliards)} milliards`)
  if (millions)  parts.push(millions === 1 ? 'un million' : `${moinsDeMille(millions)} millions`)
  if (milliers)  parts.push(milliers === 1 ? 'mille' : `${sansAccordFinal(moinsDeMille(milliers))} mille`)
  if (reste)     parts.push(moinsDeMille(reste))

  return parts.join(' ')
}

export function montantEnLettres(montant: number): string {
  const n = Math.floor(Math.abs(montant))
  return `${nombreEnLettres(n)} franc${n > 1 ? 's' : ''}`
}
