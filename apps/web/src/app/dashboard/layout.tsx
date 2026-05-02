import { type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BottomNav } from './_components/bottom-nav'

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <span className="text-base font-bold tracking-tight text-zinc-950">TeamDJ</span>
          <span className="text-sm text-zinc-500">
            {user.user_metadata?.name ?? user.email}
          </span>
        </div>
      </header>

      {/* 페이지 본문 */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5 pb-24">
        {children}
      </main>

      {/* 하단 네비게이션 (클라이언트 — usePathname으로 활성 상태 처리) */}
      <BottomNav />
    </div>
  )
}
