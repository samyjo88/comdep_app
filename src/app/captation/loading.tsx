export default function Loading() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl border bg-muted" />
        ))}
      </div>
      <div className="h-64 rounded-xl border bg-muted" />
    </div>
  )
}
