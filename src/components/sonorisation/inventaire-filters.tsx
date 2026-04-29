'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CATEGORIES, STATUTS } from '@/lib/sonorisation/constants'

export function InventaireFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const q         = searchParams.get('q') ?? ''
  const categorie = searchParams.get('categorie') ?? ''
  const statut    = searchParams.get('statut') ?? ''

  const hasFilters = q || categorie || statut

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function reset() {
    startTransition(() => router.push(pathname))
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Recherche texte */}
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          defaultValue={q}
          onChange={e => update('q', e.target.value)}
          placeholder="Rechercher (nom, marque, réf…)"
          className="pl-9"
        />
      </div>

      {/* Filtre catégorie */}
      <select
        value={categorie}
        onChange={e => update('categorie', e.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Toutes les catégories</option>
        {CATEGORIES.map(c => (
          <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
        ))}
      </select>

      {/* Filtre statut */}
      <select
        value={statut}
        onChange={e => update('statut', e.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Tous les statuts</option>
        {STATUTS.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
          <X className="h-4 w-4" />
          Réinitialiser
        </Button>
      )}
    </div>
  )
}
