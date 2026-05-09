'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Music } from 'lucide-react'

type CantiquResult = {
  id: string
  categorie: 'gad' | 'chorale'
  numero_gad: string | null
  titre: string
  tonalite: string | null
}

export function RechercheRapide() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<CantiquResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setOpen(false)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any
        const { data } = await supabase
          .from('cantiques')
          .select('id, categorie, numero_gad, titre, tonalite')
          .or(`titre.ilike.%${query}%,numero_gad.ilike.%${query}%`)
          .eq('actif', true)
          .order('nb_utilisations', { ascending: false })
          .limit(5)
        setResults((data ?? []) as CantiquResult[])
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Chercher un cantique par titre ou numéro GAD…"
          className="pl-9 h-11 text-base"
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border rounded-xl shadow-lg z-50 overflow-hidden">
          {loading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">Recherche…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Music className="h-4 w-4 shrink-0" />
              Aucun cantique trouvé pour « {query} »
            </div>
          ) : (
            <ul role="listbox">
              {results.map(c => (
                <li key={c.id} role="option" aria-selected="false">
                  <Link
                    href={`/projection/cantiques/${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    onMouseDown={e => e.preventDefault()}
                  >
                    <Badge
                      variant="outline"
                      className={
                        c.categorie === 'gad'
                          ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 shrink-0 text-[11px] px-1.5'
                          : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 shrink-0 text-[11px] px-1.5'
                      }
                    >
                      {c.categorie === 'gad' ? 'GAD' : 'Chorale'}
                    </Badge>
                    {c.categorie === 'gad' && c.numero_gad && (
                      <span className="text-xs text-muted-foreground shrink-0 font-mono tabular-nums">
                        #{c.numero_gad}
                      </span>
                    )}
                    <span className="text-sm font-medium truncate flex-1">{c.titre}</span>
                    {c.tonalite && (
                      <span className="text-xs text-muted-foreground shrink-0">{c.tonalite}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
