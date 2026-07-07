export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="h-4 w-20 rounded bg-zinc-100" />
        <div className="flex items-center gap-3">
          <div className="h-6 w-28 rounded bg-zinc-200" />
          <div className="h-5 w-40 rounded-full bg-zinc-100" />
        </div>
        <div className="h-3 w-24 rounded bg-zinc-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-6">
        <div className="aspect-[3/4] rounded-xl bg-zinc-100" />
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
            <div className="h-4 w-20 rounded bg-zinc-100" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="h-3 w-24 rounded bg-zinc-100" />
                <div className="h-3 w-16 rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
