'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-xl font-bold">Une erreur est survenue</h1>
        <p className="text-sm text-muted-foreground">
          Quelque chose s&apos;est mal passé. Vous pouvez réessayer ou revenir au tableau de bord.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">
            Réf : {error.digest}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={reset} variant="default" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Réessayer
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Retour au tableau de bord</Link>
        </Button>
      </div>
    </div>
  )
}
