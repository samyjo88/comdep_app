'use client'

import { usePathname } from 'next/navigation'

const NO_HEADER_PATHS = ['/login', '/profil/reset-password']

export function ConditionalHeader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (NO_HEADER_PATHS.includes(pathname)) return null
  return <>{children}</>
}
