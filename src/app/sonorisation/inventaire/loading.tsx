export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-shimmer" />
      <div className="h-10 w-full rounded bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-shimmer" />
      <div className="rounded-lg border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b last:border-0">
            <div className="h-5 w-40 rounded bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-shimmer" />
            <div className="h-5 w-24 rounded bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-shimmer" />
            <div className="h-5 w-32 rounded bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-shimmer" />
            <div className="h-5 w-20 rounded bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-shimmer ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
