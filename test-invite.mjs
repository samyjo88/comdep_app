/**
 * Script de test — envoi d'une invitation Supabase Auth
 * Usage : node test-invite.mjs
 *
 * Nécessite un .env.local avec :
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *   NEXT_PUBLIC_APP_URL=https://votre-app.vercel.app  (ou http://localhost:3000)
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// ── Charger .env.local manuellement ────────────────────────────────────────

try {
  const env = readFileSync('.env.local', 'utf8')
  for (const line of env.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length > 0 && !key.startsWith('#')) {
      process.env[key.trim()] = rest.join('=').trim().replace(/^"|"$/g, '')
    }
  }
} catch {
  console.error('❌  Fichier .env.local introuvable. Créez-le à la racine du projet.')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

if (!url || !key) {
  console.error('❌  Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// ── Invitation ──────────────────────────────────────────────────────────────

const email  = 'ksamuel.koffi@gmail.com'
const prenom = 'Samuel'
const nom    = 'Koffi'

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log(`\n📧  Envoi d'une invitation à ${email} …\n`)
console.log(`    redirectTo → ${appUrl}/auth/callback\n`)

const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
  data: { prenom, nom },
  redirectTo: `${appUrl}/auth/callback`,
})

if (error) {
  if (error.message.toLowerCase().includes('already')) {
    console.log('⚠️   Compte déjà existant — l\'invitation n\'est pas renvoyée par Supabase.')
    console.log('    Utilisez "Réinitialiser le mot de passe" depuis /admin/membres à la place.')
  } else {
    console.error('❌  Erreur :', error.message)
  }
} else {
  console.log('✅  Invitation envoyée avec succès !')
  console.log(`    User ID : ${data.user.id}`)
  console.log(`    Email   : ${data.user.email}`)
  console.log(`\n    Vérifiez la boîte mail ${email} — le lien expire dans 24h.`)
}
