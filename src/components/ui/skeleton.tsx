import { cn } from '@/lib/utils'

/** Espace réservé animé affiché pendant le chargement des données. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        'rounded-lg bg-[length:200%_100%] animate-shimmer',
        'bg-gradient-to-r from-muted via-muted-foreground/10 to-muted',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
