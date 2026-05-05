import { type ReactNode } from 'react'
import Link from 'next/link'
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

  // 읽지 않은 메시지 수 확인
  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('student_id', user.id)
    .eq('is_active', true)
  const classIds = (memberships ?? []).map(m => m.class_id)

  const { count: unreadCount } = await supabase
    .from('push_messages')
    .select('*', { count: 'exact', head: true })
    .or(`student_id.eq.${user.id}${classIds.length > 0 ? `,class_id.in.(${classIds.join(',')})` : ''}`)
    .eq('is_read', false)

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white px-5 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tighter text-zinc-950 uppercase italic">TeamDJ</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/dashboard/messages" className="relative group p-1.5 rounded-xl hover:bg-zinc-100 transition-colors">
              <svg className="w-6 h-6 text-zinc-950" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </Link>
            <span className="text-sm font-semibold text-zinc-600">
              {user.user_metadata?.name ?? user.email}
            </span>
          </div>
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
