export default function Loading() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl animate-pulse">
      <div className="space-y-2 mb-6">
        <div className="h-7 w-36 rounded bg-muted" />
        <div className="h-4 w-72 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-64 rounded-xl border bg-muted" />
          <div className="h-24 rounded-xl border bg-muted" />
          <div className="h-48 rounded-xl border bg-muted" />
        </div>
        <div className="space-y-6">
          <div className="h-56 rounded-xl border bg-muted" />
          <div className="h-40 rounded-xl border bg-muted" />
          <div className="h-24 rounded-xl border bg-muted" />
        </div>
      </div>
    </div>
  )
}
