'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export function LoginButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full h-10 mt-2" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
      {pending ? 'Connexion…' : 'Se connecter'}
    </Button>
  )
}
