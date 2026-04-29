'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORIES } from '@/lib/sonorisation/constants'

export function MaterielFiltres() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const q         = searchParams.get('q') ?? ''
  const categorie = searchParams.get('categorie') ?? ''
  const hasFilters = q || categorie

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'toutes') params.set(key, value)
    else params.delete(key)
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function reset() {
    startTransition(() => router.push(pathname))
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-56">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          defaultValue={q}
          onChange={e => update('q', e.target.value)}
          placeholder="Rechercher par nom…"
          className="pl-9"
        />
      </div>

      <Select
        value={categorie || 'toutes'}
        onValueChange={v => update('categorie', v)}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Toutes les catégories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="toutes">Toutes les catégories</SelectItem>
          {CATEGORIES.map(c => (
            <SelectItem key={c.value} value={c.value}>
              {c.emoji} {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground gap-1">
          <X className="h-3.5 w-3.5" />
          Réinitialiser
        </Button>
      )}
    </div>
  )
}
