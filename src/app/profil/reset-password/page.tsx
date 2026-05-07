'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { KeyRound, CheckCircle }   from 'lucide-react'
import { createClient }            from '@/lib/supabase/client'
import { Button }                  from '@/components/ui/button'
import { Input }                   from '@/components/ui/input'
import { Label }                   from '@/components/ui/label'

export default function ResetPasswordPage() {
  const router               = useRouter()
  const [pending, start]     = useTransition()
  const [error, setError]    = useState('')
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd       = new FormData(e.currentTarget)
    const password = fd.get('password') as string
    const confirm  = fd.get('confirm')  as string

    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas');           return }

    setError('')
    start(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setError(error.message); return }
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    })
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center mx-auto w-12 h-12 rounded-xl bg-primary">
            <KeyRound className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nouveau mot de passe</h1>
            <p className="text-sm text-muted-foreground mt-1">Choisissez un mot de passe sécurisé</p>
          </div>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium">Mot de passe mis à jour !</p>
            <p className="text-xs text-muted-foreground">Redirection vers le tableau de bord…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="8 caractères minimum"
                required
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                required
                className="h-10"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full h-10 mt-2" disabled={pending}>
              {pending ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}
