import { type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { redirect } from 'next/navigation'
import { BottomNav } from './_components/bottom-nav'
import { NotificationsProvider } from '@/contexts/notifications-context'
import { NotificationBell } from '@/components/ui/notification-bell'
import { ToastContainer } from '@/components/ui/toast'
import { InactivityGuard } from '@/components/ui/inactivity-guard'

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getVerifiedUser()

  if (!user) redirect('/login')

  // 휴원 상태 확인
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dbUser } = await (supabase as any)
    .from('users')
    .select('suspended_from, suspended_until')
    .eq('id', user.id)
    .single()

  const today = new Date().toISOString().slice(0, 10)
  const suspFrom = dbUser?.suspended_from as string | null
  const suspUntil = dbUser?.suspended_until as string | null
  const isSuspended = !!(suspFrom && suspUntil && suspFrom <= today && today <= suspUntil)

  return (
    <NotificationsProvider userId={user.id}>
      <div className="flex flex-col min-h-screen bg-zinc-50">
        {/* 상단 헤더 */}
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white px-5 py-3">
          <div className="flex items-center justify-between max-w-lg lg:max-w-5xl mx-auto">
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tighter text-zinc-950 uppercase italic">TeamDJ</span>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <span className="text-sm font-semibold text-zinc-600">
                {user.user_metadata?.name ?? user.email}
              </span>
            </div>
          </div>
        </header>

        {/* 휴원 배너 */}
        {isSuspended && suspUntil && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5">
            <div className="max-w-lg lg:max-w-5xl mx-auto flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-xs text-amber-800">
                현재 휴원 중입니다.
                (종료일: {new Date(suspUntil).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })})
                {' '}일부 기능이 제한됩니다.
              </p>
            </div>
          </div>
        )}

        {/* 페이지 본문 */}
        <main className="flex-1 max-w-lg lg:max-w-5xl mx-auto w-full px-4 py-5 pb-24">
          {children}
        </main>

        {/* 하단 네비게이션 (클라이언트 — usePathname으로 활성 상태 처리) */}
        <BottomNav />
        <ToastContainer />
        <InactivityGuard />
      </div>
    </NotificationsProvider>
  )
}
