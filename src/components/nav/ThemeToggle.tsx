'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch — render after mount only
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="w-8 h-8 shrink-0" aria-hidden />

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      {isDark
        ? <Sun  className="h-4 w-4 transition-transform duration-200" />
        : <Moon className="h-4 w-4 transition-transform duration-200" />
      }
    </Button>
  )
}
