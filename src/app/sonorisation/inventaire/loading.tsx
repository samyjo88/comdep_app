export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-10 w-full rounded bg-muted" />
      <div className="rounded-lg border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b last:border-0">
            <div className="h-5 w-40 rounded bg-muted" />
            <div className="h-5 w-24 rounded bg-muted" />
            <div className="h-5 w-32 rounded bg-muted" />
            <div className="h-5 w-20 rounded bg-muted ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
