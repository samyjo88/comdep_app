'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { supprimerMembreDashboard } from '@/app/dashboard/actions'
import { toast } from 'sonner'

interface Props {
  id:          string | number
  departement: string
  nomComplet:  string
}

export function DeleteMembreDashboardButton({ id, departement, nomComplet }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const res = await supprimerMembreDashboard(id, departement)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`${nomComplet} retiré de l'équipe`)
      }
      setConfirming(false)
    })
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="text-[10px] font-semibold px-2 py-1 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Oui'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          Non
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={`Supprimer ${nomComplet}`}
      className="shrink-0 p-1.5 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}
