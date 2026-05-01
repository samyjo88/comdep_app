'use client'

import { useActionState } from 'react'
import { preparerCulte } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, ArrowRight, CalendarDays, Loader2, Mic, BookOpen } from 'lucide-react'

// La date du jour au format YYYY-MM-DD pour le min du date picker
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function NouveauCultePage() {
  const [state, action, isPending] = useActionState(preparerCulte, null)
  const error = state && 'error' in state ? state.error : null

  return (
    <div className="container mx-auto py-10 px-4 max-w-lg">

      {/* En-tête */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <CalendarDays className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Nouveau culte</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
          Renseignez les informations du culte pour démarrer la préparation des annonces.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Informations du culte</CardTitle>
          <CardDescription className="text-sm">
            Ces données seront visibles dans toutes les rubriques d&apos;annonces.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={action} className="space-y-5">

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="date_culte" className="text-sm font-medium">
                Date du culte <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="date_culte"
                  name="date_culte"
                  type="date"
                  min={today()}
                  required
                  disabled={isPending}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Thème */}
            <div className="space-y-1.5">
              <Label htmlFor="theme" className="text-sm font-medium">
                Thème de la prédication
              </Label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="theme"
                  name="theme"
                  type="text"
                  placeholder="ex : La grâce de Dieu"
                  disabled={isPending}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Prédicateur */}
            <div className="space-y-1.5">
              <Label htmlFor="predicateur" className="text-sm font-medium">
                Prédicateur
              </Label>
              <div className="relative">
                <Mic className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="predicateur"
                  name="predicateur"
                  type="text"
                  placeholder="ex : Pasteur Martin"
                  disabled={isPending}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Bouton de soumission */}
            <Button
              type="submit"
              disabled={isPending}
              className="w-full gap-2 h-11 text-base font-semibold mt-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création en cours…
                </>
              ) : (
                <>
                  Commencer la préparation
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

          </form>
        </CardContent>
      </Card>

      {/* Note informative */}
      <p className="text-xs text-muted-foreground text-center mt-6">
        7 rubriques seront créées automatiquement : salutation, culte précédent,
        culte du jour, conférence, district, circuit et église locale.
      </p>

    </div>
  )
}
