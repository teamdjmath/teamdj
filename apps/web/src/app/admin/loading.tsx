export default function AdminLoading() {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* 데스크탑 사이드바 스켈레톤 */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r border-zinc-200 bg-white">
        <div className="flex h-14 items-center px-5 border-b border-zinc-100">
          <div className="h-4 w-20 rounded bg-zinc-100 animate-pulse" />
        </div>
        <div className="flex-1 px-3 py-4 space-y-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="h-4 w-4 rounded bg-zinc-100 animate-pulse" />
              <div className="h-3 w-20 rounded bg-zinc-100 animate-pulse" />
            </div>
          ))}
        </div>
      </aside>

      {/* 모바일 헤더 스켈레톤 */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white px-4 h-14">
        <div className="h-4 w-16 rounded bg-zinc-100 animate-pulse" />
        <div className="h-8 w-8 rounded-lg bg-zinc-100 animate-pulse" />
      </div>

      {/* 본문 */}
      <div className="flex-1 md:pl-56">
        <main className="p-5 pt-20 md:pt-5 max-w-5xl space-y-4">
          {/* 페이지 제목 스켈레톤 */}
          <div className="space-y-2">
            <div className="h-6 w-36 rounded bg-zinc-200 animate-pulse" />
            <div className="h-3 w-48 rounded bg-zinc-100 animate-pulse" />
          </div>
          {/* 카드 3개 */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-3 animate-pulse">
              <div className="h-4 w-32 rounded bg-zinc-100" />
              <div className="h-3 w-full rounded bg-zinc-100" />
              <div className="h-3 w-3/4 rounded bg-zinc-100" />
            </div>
          ))}
        </main>
      </div>
    </div>
  )
}
