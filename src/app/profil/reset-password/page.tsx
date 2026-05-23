import { ResetPasswordClient } from './ResetPasswordClient'
import type { Metadata }       from 'next'

export const metadata: Metadata = { title: 'Définir votre mot de passe' }

export default function ResetPasswordPage() {
  return <ResetPasswordClient />
}
