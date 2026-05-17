import { redirect } from 'next/navigation'
import { CommunityBreadcrumb, CommunityNavTabs } from '@/components/community/CommunityNavTabs'
import { PageTransition } from '@/components/PageTransition'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Community Management',
    default:  'Community Management',
  },
}

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: role } = await supabase.rpc('get_my_role')
    if (role === 'membre' || role === 'redacteur') {
      const { data } = await supabase
        .from('membres_cm')
        .select('id')
        .eq('email', user.email)
        .limit(1)
      if (!data || data.length === 0) redirect('/dashboard')
    }
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card sticky top-12 z-30 shadow-sm">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center gap-3 pt-4 pb-1">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0 text-xl leading-none">
              📱
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-bold leading-tight tracking-tight">
                Community Management
              </span>
              <CommunityBreadcrumb />
            </div>
          </div>

          <CommunityNavTabs />
        </div>
      </div>

      <main><PageTransition>{children}</PageTransition></main>
    </div>
  )
}
