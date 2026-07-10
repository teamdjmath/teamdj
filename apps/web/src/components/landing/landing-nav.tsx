import Link from 'next/link'

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/90 backdrop-blur-sm">
      <div className="container max-w-5xl mx-auto px-3 sm:px-4 flex h-14 items-center justify-between gap-2">
        <Link href="/" className="text-sm font-black tracking-tighter text-zinc-950 uppercase italic shrink-0">
          TeamDJ
        </Link>
        <nav className="flex items-center gap-1.5 sm:gap-4">
          <Link
            href="/intro"
            className="whitespace-nowrap px-1.5 sm:px-0 text-xs sm:text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors"
          >
            소개
          </Link>
          <Link
            href="/notices"
            className="whitespace-nowrap px-1.5 sm:px-0 text-xs sm:text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors"
          >
            공지사항
          </Link>
          <Link
            href="/consultation"
            className="whitespace-nowrap rounded-full bg-zinc-950 px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
          >
            상담 신청
          </Link>
          <Link
            href="/report-builder"
            className="hidden sm:inline-block whitespace-nowrap rounded-full border border-zinc-200 px-4 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            학습 리포트
          </Link>
          <Link
            href="/login"
            className="whitespace-nowrap rounded-full border border-zinc-200 px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            로그인
          </Link>
        </nav>
      </div>
    </header>
  )
}
