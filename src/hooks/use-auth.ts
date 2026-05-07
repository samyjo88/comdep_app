'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { AppRole } from '@/lib/supabase/types'

interface AuthState {
  user:    User | null
  role:    AppRole | null
  loading: boolean
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, role: null, loading: true })

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { data: { user } } = await db.auth.getUser()

      if (!user) {
        setState({ user: null, role: null, loading: false })
        return
      }

      const { data: role } = await db.rpc('get_my_role')
      setState({ user, role: role ?? null, loading: false })
    }

    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load()
    })

    return () => subscription.unsubscribe()
  }, [])

  return state
}

// Helpers pour vérifier les permissions
export function canAdmin(role: AppRole | null): boolean {
  return role === 'super_admin' || role === 'admin'
}

export function canEdit(role: AppRole | null): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'responsable' || role === 'redacteur'
}

export function isMembre(role: AppRole | null): boolean {
  return role !== null
}
