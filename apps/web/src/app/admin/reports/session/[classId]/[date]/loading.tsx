export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-20 rounded bg-zinc-100" />
        <div className="h-6 w-48 rounded bg-zinc-200" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
            <div className="aspect-[3/4] rounded-xl bg-zinc-100" />
            <div className="h-3 w-2/3 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
