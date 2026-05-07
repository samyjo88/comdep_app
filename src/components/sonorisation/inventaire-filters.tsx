'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CATEGORIES, STATUTS } from '@/lib/sonorisation/constants'

export function InventaireFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  function handleSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => update('q', value), 300)
  }

  function reset() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    startTransition(() => router.push(pathname))
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      {/* Recherche texte */}
      <div className="relative w-full sm:flex-1 sm:min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          defaultValue={q}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Rechercher (nom, marque, réf…)"
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 sm:contents">
        {/* Filtre catégorie */}
        <select
          value={categorie}
          onChange={e => update('categorie', e.target.value)}
          className="flex-1 sm:flex-none h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          className="flex-1 sm:flex-none h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground w-full sm:w-auto">
          <X className="h-4 w-4" />
          Réinitialiser
        </Button>
      )}
    </div>
  )
}
