export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-16 rounded bg-zinc-100" />
        <div className="h-6 w-48 rounded bg-zinc-200" />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 rounded bg-zinc-100" />
          <div className="h-5 w-16 rounded-full bg-zinc-100" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-zinc-100" />
          <div className="h-3 w-full rounded bg-zinc-100" />
          <div className="h-3 w-2/3 rounded bg-zinc-100" />
        </div>
      </div>

      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-3">
          <div className="h-4 w-20 rounded bg-zinc-100" />
          <div className="h-3 w-full rounded bg-zinc-100" />
          <div className="h-3 w-5/6 rounded bg-zinc-100" />
        </div>
      ))}
    </div>
  )
}
