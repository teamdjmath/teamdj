export default function DashboardLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50">
      {/* 헤더 스켈레톤 */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white px-5 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="h-4 w-16 rounded bg-zinc-100 animate-pulse" />
          <div className="h-6 w-6 rounded bg-zinc-100 animate-pulse" />
        </div>
      </header>

      {/* 본문 스켈레톤 */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5 pb-24 space-y-4">
        <div className="h-5 w-28 rounded bg-zinc-200 animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 animate-pulse">
            <div className="h-4 w-24 rounded bg-zinc-100" />
            <div className="h-3 w-full rounded bg-zinc-100" />
            <div className="h-3 w-2/3 rounded bg-zinc-100" />
          </div>
        ))}
      </main>

      {/* 하단 탭바 스켈레톤 */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white">
        <div className="flex justify-around max-w-lg mx-auto py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 px-3 py-1">
              <div className="h-6 w-6 rounded bg-zinc-100 animate-pulse" />
              <div className="h-2 w-8 rounded bg-zinc-100 animate-pulse" />
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}
