export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-1">
        <div className="h-3 w-16 rounded bg-zinc-100" />
        <div className="h-6 w-40 rounded bg-zinc-200" />
        <div className="h-3 w-28 rounded bg-zinc-100" />
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-3">
        <div className="h-4 w-20 rounded bg-zinc-100" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-t border-zinc-50">
            <div className="h-3 w-24 rounded bg-zinc-100" />
            <div className="h-5 w-16 rounded-full bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
