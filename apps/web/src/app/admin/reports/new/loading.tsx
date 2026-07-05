export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-1">
        <div className="h-3 w-16 rounded bg-zinc-100" />
        <div className="h-6 w-32 rounded bg-zinc-200" />
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
        <div className="h-4 w-24 rounded bg-zinc-100" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-zinc-100" />
          ))}
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-3">
          <div className="h-4 w-20 rounded bg-zinc-100" />
          <div className="h-3 w-full rounded bg-zinc-100" />
          <div className="h-3 w-2/3 rounded bg-zinc-100" />
        </div>
      ))}
    </div>
  )
}
