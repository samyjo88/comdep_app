'use client'

import { useTransition } from 'react'
import Link              from 'next/link'
import { UserCircle, LogOut, ChevronDown, Shield } from 'lucide-react'
import type { AppRole } from '@/lib/supabase/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOutAction } from '@/app/profil/actions'

interface UserMenuClientProps {
  initiales: string
  prenom:    string
  nom:       string
  email:     string
  role:      AppRole | null
}

export function UserMenuClient({ initiales, prenom, nom, email, role }: UserMenuClientProps) {
  const [pending, startTransition] = useTransition()

  function handleSignOut() {
    startTransition(() => signOutAction())
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Menu utilisateur"
        >
          {/* Avatar initiales */}
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary text-primary-foreground text-[11px] font-bold select-none shrink-0">
            {initiales}
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-semibold">{prenom} {nom}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {role === 'super_admin' && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/admin/membres" className="flex items-center gap-2 cursor-pointer">
                <Shield className="h-4 w-4 text-purple-500" />
                Administration
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link href="/profil" className="flex items-center gap-2 cursor-pointer">
            <UserCircle className="h-4 w-4" />
            Mon profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
          onClick={handleSignOut}
          disabled={pending}
        >
          <LogOut className="h-4 w-4" />
          {pending ? 'Déconnexion…' : 'Se déconnecter'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
