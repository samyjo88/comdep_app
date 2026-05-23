'use client'

import { useState, useTransition } from 'react'
import { forgotPasswordAction }    from './actions'
import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'
import { Label }   from '@/components/ui/label'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export function ForgotPasswordForm() {
  const [open, setOpen]       = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await forgotPasswordAction(fd)
      if (res.error) { setError(res.error); return }
      setSent(true)
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Mot de passe oublié ?
      </button>
    )
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-2 py-2 text-center text-sm">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <p className="font-medium">E-mail envoyé !</p>
        <p className="text-muted-foreground text-xs">Vérifiez votre boîte de réception pour réinitialiser votre mot de passe.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="reset-email">Adresse e-mail</Label>
        <Input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vous@eglise.fr"
          required
          className="h-10"
        />
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <Button type="submit" className="w-full h-10" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {pending ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
      </Button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Retour à la connexion
      </button>
    </form>
  )
}
