export default function Loading() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-muted" />
        <div className="h-4 w-80 rounded bg-muted" />
      </div>
      <div className="h-24 rounded-2xl bg-muted" />
      <div className="space-y-4">
        <div className="h-5 w-24 rounded bg-muted" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-5 w-32 rounded bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-52 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}
