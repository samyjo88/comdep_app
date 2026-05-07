export default function Loading() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 rounded bg-muted" />
        <div className="h-9 w-36 rounded-md bg-muted" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl border bg-muted" />
        ))}
      </div>
    </div>
  )
}
