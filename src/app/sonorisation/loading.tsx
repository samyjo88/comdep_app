export default function Loading() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-6 animate-pulse">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border bg-muted" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl border bg-muted" />
        ))}
      </div>
    </div>
  )
}
