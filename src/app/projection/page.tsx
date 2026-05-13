import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Monitor, Construction, ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Projection / Proclaim' }

export default function ProjectionPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40">
            <Monitor className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Projection / Proclaim</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1 ml-[52px]">
          Gestion des présentations et de la projection lors des cultes
        </p>
      </div>

      <Card className="border-dashed border-2">
        <CardContent className="py-16 text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/40 mx-auto">
            <Construction className="h-8 w-8 text-purple-400" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">Module en construction</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Le module Projection / Proclaim est en cours de développement.
              Il permettra de gérer les listes de cantiques, les présentations
              et la synchronisation avec Proclaim.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {['Gestion des cantiques', 'Listes de culte', 'Synchronisation Proclaim', 'Historique'].map(f => (
              <span
                key={f}
                className="text-xs px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
              >
                {f}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
