import { redirect } from 'next/navigation'
import { Volume2 } from 'lucide-react'
import { SonoBreadcrumb, SonoNavTabs } from '@/components/sonorisation/SonoNavTabs'
import { PageTransition } from '@/components/PageTransition'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Sonorisation',
    default: 'Sonorisation',
  },
}

export default async function SonorisationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: role } = await supabase.rpc('get_my_role')
    if (role === 'membre' || role === 'redacteur') {
      const { data } = await supabase
        .from('membres_son')
        .select('id')
        .eq('email', user.email)
        .limit(1)
      if (!data || data.length === 0) redirect('/dashboard')
    }
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Barre de navigation du module */}
      <div className="border-b bg-card sticky top-12 z-30 shadow-sm">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* En-tête + breadcrumb */}
          <div className="flex items-center gap-3 pt-4 pb-1">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
              <Volume2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-bold leading-tight tracking-tight">
                Sonorisation
              </span>
              <SonoBreadcrumb />
            </div>
          </div>

          {/* Onglets */}
          <SonoNavTabs />
        </div>
      </div>

      {/* Contenu de la page */}
      <main><PageTransition>{children}</PageTransition></main>
    </div>
  )
}
