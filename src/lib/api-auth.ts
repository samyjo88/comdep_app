import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Vérifie qu'une session Supabase valide existe dans la requête en cours.
 * Retourne { user } si OK, ou { error, status } si non authentifié.
 */
export async function requireAuth() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) => {
          try {
            c.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch { /* Route Handler — headers already sent */ }
        },
      },
    },
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, unauthorized: true } as const
  }

  return { user, unauthorized: false } as const
}

export function unauthorizedResponse() {
  return Response.json({ error: 'Non autorisé' }, { status: 401 })
}
