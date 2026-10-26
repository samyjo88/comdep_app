import Image from 'next/image'
import { loginAction } from './actions'
import { BrandMark } from '@/components/brand/BrandMark'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import { LoginButton } from './LoginButton'
import { ForgotPasswordForm } from './ForgotPasswordForm'
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
    <main className="grid min-h-dvh flex-1 lg:grid-cols-[1.05fr_1fr]">
      {/* Panneau de marque */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#4a7a2d] via-brand-green to-brand-green-light text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Image
          src="/brand/emci-icon.png"
          alt=""
          width={640}
          height={640}
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-28 w-[560px] opacity-[0.13] mix-blend-luminosity"
        />
        <div className="relative flex items-center gap-3 rounded-2xl bg-white/95 p-3 pr-5 shadow-lg shadow-black/10 backdrop-blur w-fit">
          <BrandMark taille={44} className="text-[#17210f] [&_.text-muted-foreground]:text-[#4d5a45]" />
        </div>

        <div className="relative max-w-md space-y-6 animate-rise">
          <h2 className="font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight">
            Préparer chaque culte,<br />ensemble.
          </h2>
          <p className="text-lg leading-relaxed text-white/85">
            Sonorisation, projection, annonces, captation et réseaux sociaux :
            toute l&apos;équipe de communication au même endroit.
          </p>
        </div>

        <figure className="relative max-w-md border-l-2 border-brand-gold pl-4">
          <blockquote className="font-display text-lg italic leading-snug text-white/95">
            «&nbsp;Mais que tout se fasse avec bienséance et avec ordre.&nbsp;»
          </blockquote>
          <figcaption className="mt-1 text-sm text-white/70">1 Corinthiens 14:40</figcaption>
        </figure>
      </section>

      {/* Formulaire */}
      <section className="flex flex-col items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm space-y-8 animate-rise">
          <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
            <BrandMark taille={48} className="lg:hidden" />
            <div>
              <h1 className="font-display text-3xl font-bold">Bon retour</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Connectez-vous à l&apos;espace du comité de communication.
              </p>
            </div>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error === 'Invalid login credentials'
                ? 'E-mail ou mot de passe incorrect.'
                : error}
              </span>
            </div>
          )}

          <form action={loginAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.com"
                required
                className="h-11 rounded-xl"
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
                className="h-11 rounded-xl"
              />
            </div>

            <LoginButton />
          </form>

          <ForgotPasswordForm />

          <p className="text-center text-xs text-muted-foreground lg:text-left">
            Église Méthodiste de Côte d&apos;Ivoire · Horeb Cité SIR
          </p>
        </div>
      </section>
    </main>
  )
}
