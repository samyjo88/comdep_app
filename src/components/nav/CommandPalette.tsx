'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { CornerDownLeft, Moon, Search, Sun, type LucideIcon } from 'lucide-react'
import { NAV_GENERAL, NAV_COMPTE, modulesVisibles } from '@/lib/navigation'
import { cn } from '@/lib/utils'

const EVENEMENT = 'comdept:ouvrir-palette'

/** Ouvre la palette de commandes depuis n'importe quel composant client. */
export function ouvrirPalette() {
  window.dispatchEvent(new Event(EVENEMENT))
}

interface Commande {
  id:      string
  label:   string
  groupe:  string
  icon?:   LucideIcon
  module?: string
  action:  () => void
}

function normaliser(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

interface Props {
  modulesAccessibles: string[] | null
  estAdmin:           boolean
}

export function CommandPalette({ modulesAccessibles, estAdmin }: Props) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [ouvert, setOuvert]   = useState(false)
  const [requete, setRequete] = useState('')
  const [index, setIndex]     = useState(0)
  const listeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOuvert(v => !v)
      }
    }
    function onOuvrir() { setOuvert(true) }
    window.addEventListener('keydown', onKey)
    window.addEventListener(EVENEMENT, onOuvrir)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(EVENEMENT, onOuvrir)
    }
  }, [])

  const commandes = useMemo<Commande[]>(() => {
    const aller = (href: string) => () => router.push(href)
    const liste: Commande[] = NAV_GENERAL.map(l => ({
      id: l.href, label: l.label, groupe: 'Navigation', icon: l.icon, action: aller(l.href),
    }))
    for (const m of modulesVisibles(modulesAccessibles)) {
      liste.push({ id: m.href, label: m.label, groupe: 'Modules', icon: m.icon, module: m.key, action: aller(m.href) })
      for (const p of m.pages) {
        liste.push({
          id: p.href, label: `${m.court} › ${p.label}`, groupe: 'Modules',
          icon: m.icon, module: m.key, action: aller(p.href),
        })
      }
    }
    for (const l of NAV_COMPTE) {
      if (l.adminOnly && !estAdmin) continue
      liste.push({ id: l.href, label: l.label, groupe: 'Compte', icon: l.icon, action: aller(l.href) })
    }
    const sombre = resolvedTheme === 'dark'
    liste.push({
      id: 'theme', groupe: 'Préférences',
      label: sombre ? 'Passer en mode clair' : 'Passer en mode sombre',
      icon: sombre ? Sun : Moon,
      action: () => setTheme(sombre ? 'light' : 'dark'),
    })
    return liste
  }, [modulesAccessibles, estAdmin, resolvedTheme, router, setTheme])

  const resultats = useMemo(() => {
    const q = normaliser(requete.trim())
    if (!q) return commandes
    return commandes.filter(c => normaliser(c.label).includes(q))
  }, [commandes, requete])

  function fermer(v: boolean) {
    setOuvert(v)
    if (!v) { setRequete(''); setIndex(0) }
  }

  function executer(c: Commande) {
    fermer(false)
    c.action()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex(i => Math.min(i + 1, resultats.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && resultats[index]) {
      e.preventDefault()
      executer(resultats[index])
    }
  }

  useEffect(() => {
    listeRef.current
      ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [index])

  return (
    <DialogPrimitive.Root open={ouvert} onOpenChange={fermer}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border bg-popover shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          onKeyDown={onKeyDown}
        >
          <DialogPrimitive.Title className="sr-only">Palette de commandes</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Tapez pour rechercher une page ou une action, puis Entrée pour l&apos;ouvrir.
          </DialogPrimitive.Description>
          <div className="flex items-center gap-3 border-b px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={requete}
              onChange={e => { setRequete(e.target.value); setIndex(0) }}
              placeholder="Rechercher une page, un module, une action…"
              className="h-14 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Rechercher"
            />
            <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">Échap</kbd>
          </div>

          <div ref={listeRef} className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
            {resultats.length === 0 && (
              <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                Aucun résultat pour « {requete} »
              </p>
            )}
            {resultats.map((c, i) => {
              const afficherGroupe = i === 0 || c.groupe !== resultats[i - 1].groupe
              const Icon = c.icon
              return (
                <div key={c.id}>
                  {afficherGroupe && (
                    <p className="px-3 pb-1 pt-3 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {c.groupe}
                    </p>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === index}
                    data-index={i}
                    data-module={c.module}
                    onMouseMove={() => setIndex(i)}
                    onClick={() => executer(c)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                      i === index ? 'bg-accent text-accent-foreground' : 'text-foreground',
                    )}
                  >
                    {Icon && (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-module/10 text-module">
                        <Icon className="h-4 w-4" />
                      </span>
                    )}
                    <span className="flex-1 truncate">{c.label}</span>
                    {i === index && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </div>
              )
            })}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
