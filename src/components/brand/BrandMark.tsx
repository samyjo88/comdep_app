import Image from 'next/image'
import { cn } from '@/lib/utils'

export const NOM_COMMUNAUTE = 'Horeb Cité SIR'
export const NOM_COMPOSANTE = 'Comité de communication'

interface Props {
  className?: string
  /** Taille de l'icône du logo en pixels */
  taille?: number
  /** Masque le texte (icône seule) */
  iconeSeule?: boolean
}

/**
 * Bloc-marque selon le « principe d'endossement » de la charte :
 * logo de l'Église, filet vertical, puis nom de la composante en
 * capitales dans la police de la marque (Futura → Jost).
 */
export function BrandMark({ className, taille = 32, iconeSeule = false }: Props) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <Image
        src="/brand/emci-icon.png"
        alt="Église Méthodiste de Côte d'Ivoire"
        width={taille}
        height={taille}
        priority
        className="shrink-0 object-contain"
        style={{ width: taille, height: taille }}
      />
      {!iconeSeule && (
        <>
          <span aria-hidden className="w-px self-stretch bg-foreground/80" />
          <span className="flex flex-col justify-center leading-none font-display uppercase">
            <span className="text-[13px] font-bold tracking-wide">{NOM_COMMUNAUTE}</span>
            <span className="mt-1 whitespace-nowrap text-[9px] font-medium tracking-[0.08em] text-muted-foreground">
              {NOM_COMPOSANTE}
            </span>
          </span>
        </>
      )}
    </span>
  )
}
