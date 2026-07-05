export default function Loading() {
  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4 animate-pulse">
      <div className="h-5 w-28 rounded bg-zinc-200" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-zinc-100" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-36 rounded bg-zinc-200" />
              <div className="h-3 w-24 rounded bg-zinc-100" />
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-100" />
        </div>
      ))}
    </div>
  )
}
