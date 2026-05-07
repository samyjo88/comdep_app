import { loginAction } from './actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Connexion' }

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  // Redirect already-authenticated users straight to dashboard
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/dashboard')
  } catch { /* not configured yet — show the form */ }

  const { error } = await searchParams

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo + titre */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center mx-auto w-12 h-12 rounded-xl bg-primary">
            <span className="text-primary-foreground text-sm font-black tracking-tight">CD</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Connexion</h1>
            <p className="text-sm text-muted-foreground mt-1">
              ComDept — Département de communication
            </p>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error === 'Invalid login credentials'
              ? 'E-mail ou mot de passe incorrect.'
              : error}
            </span>
          </div>
        )}

        {/* Formulaire */}
        <form action={loginAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="vous@eglise.fr"
              required
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              className="h-10"
            />
          </div>

          <Button type="submit" className="w-full h-10 mt-2">
            Se connecter
          </Button>
        </form>
      </div>
    </main>
  )
}
