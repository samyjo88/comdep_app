import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center gap-6">
      <div className="space-y-2">
        <p className="text-8xl font-black text-muted-foreground/20 select-none tabular-nums">404</p>
        <h1 className="text-2xl font-bold tracking-tight">Page introuvable</h1>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard" className="gap-2">
          <Home className="h-4 w-4" />
          Retour au tableau de bord
        </Link>
      </Button>
    </div>
  )
}
