import { type ReactNode } from 'react'
import Link from 'next/link'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/ui/logout-button'
import { MobileNav } from './_components/mobile-nav'
import { SidebarNav } from './_components/sidebar-nav'
import { NotificationsProvider } from '@/contexts/notifications-context'
import { NotificationBell } from '@/components/ui/notification-bell'
import { PushNotificationToggle } from '@/components/ui/push-notification-toggle'
import { ToastContainer } from '@/components/ui/toast'
import { InactivityGuard } from '@/components/ui/inactivity-guard'
import { NativePickerOpener } from '@/components/ui/native-picker-opener'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { getUnreadConsultationCount } from '@/lib/actions/consultations'

// 역할 계층 정의
// 'all'       → teacher + ta_desk + ta_assistant
// 'senior'    → teacher + ta_desk
// 'teacher'   → teacher only
// 'assistant' → ta_assistant only (teacher/ta_desk는 학생 관리에서 이미 전체 열람 가능)
type NavVisibility = 'all' | 'senior' | 'teacher' | 'assistant'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: '홈', visibility: 'all' as NavVisibility, icon: 'dashboard' as const },
  { href: '/admin/classes', label: '분반 관리', visibility: 'senior' as NavVisibility, icon: 'classes' as const },
  { href: '/admin/students', label: '학생 관리', visibility: 'senior' as NavVisibility, icon: 'students' as const },
  { href: '/admin/roster', label: '학생 조회', visibility: 'assistant' as NavVisibility, icon: 'roster' as const },
  { href: '/admin/attendance', label: '출석 체크', visibility: 'senior' as NavVisibility, icon: 'attendance' as const },
  { href: '/admin/assignments', label: '과제 관리', visibility: 'senior' as NavVisibility, icon: 'assignments' as const },
  { href: '/admin/scores', label: '테스트 점수', visibility: 'senior' as NavVisibility, icon: 'scores' as const },
  { href: '/admin/exam-results', label: '특별 시험', visibility: 'senior' as NavVisibility, icon: 'exam-results' as const },
  { href: '/admin/reports', label: '학습 리포트', visibility: 'senior' as NavVisibility, icon: 'reports' as const },
  { href: '/admin/notices', label: '공지사항', visibility: 'senior' as NavVisibility, icon: 'notices' as const },
  { href: '/admin/lectures', label: '강의 영상', visibility: 'senior' as NavVisibility, icon: 'lectures' as const },
  { href: '/admin/qna', label: '질의응답', visibility: 'all' as NavVisibility, icon: 'qna' as const },
  { href: '/admin/messages', label: '문의 & 추가 발송', visibility: 'all' as NavVisibility, icon: 'messages' as const },
  { href: '/admin/qna/stats', label: '답변 통계', visibility: 'teacher' as NavVisibility, icon: 'qna-stats' as const },
  { href: '/admin/monitoring', label: '모니터링', visibility: 'teacher' as NavVisibility, icon: 'monitoring' as const },
  { href: '/admin/audit', label: '감사 로그', visibility: 'teacher' as NavVisibility, icon: 'audit' as const },
  { href: '/admin/errors', label: '오류 로그', visibility: 'teacher' as NavVisibility, icon: 'errors' as const },
] as const

export type NavItem = (typeof NAV_ITEMS)[number]

const STAFF_ROLES = ['teacher', 'ta_desk', 'ta_assistant'] as const
type StaffRole = (typeof STAFF_ROLES)[number]

function filterNavByRole(role: StaffRole) {
  return NAV_ITEMS.filter((item) => {
    if (item.visibility === 'all') return true
    if (item.visibility === 'senior') return role === 'teacher' || role === 'ta_desk'
    if (item.visibility === 'teacher') return role === 'teacher'
    if (item.visibility === 'assistant') return role === 'ta_assistant'
    return false
  })
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getVerifiedUser()

  if (!user) redirect('/login')

  const role = user.user_metadata?.role as string | undefined
  if (!STAFF_ROLES.includes(role as StaffRole)) redirect('/dashboard')

  const staffRole = role as StaffRole
  const displayName = user.user_metadata?.name ?? user.email ?? ''

  async function checkSuperAdmin(userId: string) {
    const supabase = await createClient()
    const { data } = await supabase.from('users').select('is_super_admin').eq('id', userId).maybeSingle()
    return data?.is_super_admin ?? false
  }

  const [isSuperAdmin, unreadConsultations] = staffRole === 'teacher'
    ? await Promise.all([checkSuperAdmin(user.id), getUnreadConsultationCount()])
    : [false, 0]
  const badgeLabel = isSuperAdmin ? 'admin' : staffRole
  const badges: Record<string, number> = unreadConsultations > 0 ? { '/admin/messages': unreadConsultations } : {}

  const visibleItems = filterNavByRole(staffRole)

  return (
    <NotificationsProvider userId={user.id}>
      <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">

        {/* 데스크탑 사이드바 */}
        {/* z-30: 본문 내 z-index 요소(시간표 현재 시각 라인 등)보다 위 — 알림 드롭다운이 사이드바 폭을 넘어 본문 위로 열리므로 */}
        <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 md:z-30 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          {/* 로고 */}
          <div className="flex h-14 items-center px-5 border-b border-zinc-100 dark:border-zinc-900">
            <Link href="/admin/dashboard" className="text-base font-bold tracking-tight text-zinc-950 dark:text-zinc-50">TeamDJ</Link>
            <span className="ml-2 rounded bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-500 uppercase">
              {badgeLabel}
            </span>
          </div>

          {/* 네비게이션 (클라이언트 — usePathname으로 활성 상태 처리) */}
          <SidebarNav items={visibleItems} badges={badges} />

          {/* 하단 유저 정보 */}
          <div className="border-t border-zinc-100 dark:border-zinc-900 px-4 py-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{displayName}</p>
              <div className="flex items-center gap-1 shrink-0">
                <ThemeToggle className="w-7 h-7" />
                <PushNotificationToggle />
                <NotificationBell placement="up" />
              </div>
            </div>
            <LogoutButton className="text-xs" />
          </div>
        </aside>

        {/* 모바일 헤더 */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 h-14">
          <Link href="/admin/dashboard" className="text-base font-bold text-zinc-950 dark:text-zinc-50">TeamDJ</Link>
          <div className="flex items-center gap-2">
            <ThemeToggle className="w-7 h-7" />
            <PushNotificationToggle />
            <NotificationBell />
            <span className="text-sm text-zinc-500 dark:text-zinc-500">{displayName}</span>
            <MobileNav items={visibleItems} badges={badges} />
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 md:pl-56">
          <main className="p-5 pt-20 md:pt-5 max-w-6xl">
            {children}
          </main>
        </div>

        <ToastContainer />
        <InactivityGuard />
        <NativePickerOpener />
      </div>
    </NotificationsProvider>
  )
}
