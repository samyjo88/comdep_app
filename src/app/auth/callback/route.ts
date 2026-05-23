import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code      = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type      = searchParams.get('type')
  const next      = searchParams.get('next') ?? '/dashboard'

  const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookies) { cookies.forEach(c => cookiesToSet.push(c)) },
      },
    }
  )

  let destination: string | null = null

  if (tokenHash && type) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any })
    if (!error) {
      destination = type === 'invite' ? '/profil/reset-password' : next
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      destination = next
    }
  }

  const redirectUrl = destination
    ? `${origin}${destination}`
    : `${origin}/login?error=${encodeURIComponent('Lien invalide ou expiré')}`

  const response = NextResponse.redirect(redirectUrl)
  cookiesToSet.forEach(({ name, value, options }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response.cookies.set(name, value, options as any)
  })
  return response
}
