export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-1">
        <div className="h-3 w-16 rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-6 w-36 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
        <div className="h-4 w-20 rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-3">
        <div className="h-4 w-24 rounded bg-zinc-100 dark:bg-zinc-900" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-3 w-12 rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>
        ))}
      </div>
    </div>
  )
}
