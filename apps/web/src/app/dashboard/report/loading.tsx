export default function Loading() {
  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4 animate-pulse">
      <div className="h-5 w-24 rounded bg-zinc-200" />
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
        <div className="h-4 w-20 rounded bg-zinc-100" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-zinc-100" />
          ))}
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
          <div className="h-4 w-28 rounded bg-zinc-100" />
          <div className="h-3 w-full rounded bg-zinc-100" />
          <div className="h-3 w-3/4 rounded bg-zinc-100" />
        </div>
      ))}
    </div>
  )
}
