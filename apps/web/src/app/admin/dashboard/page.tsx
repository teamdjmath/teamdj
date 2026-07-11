import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isTestName } from '@/lib/test-data'
import { DashboardScheduleClient } from './_components/dashboard-schedule-client'
import type { StaffStatus } from '@/lib/actions/staff'

function getMonthRange() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  return { start, end }
}

function toStatus(s?: string | null): StaffStatus {
  if (s === 'online' || s === 'busy' || s === 'offline') return s
  return 'offline'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

type ClassRow = {
  id: string; name: string; subject: string; grade: string
  start_time: string | null; end_time: string | null; day_of_week: number[] | null
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const user = await getVerifiedUser()
  if (!user) redirect('/login')

  const role        = user.user_metadata?.role as string | undefined
  const displayName = user.user_metadata?.name ?? user.email ?? ''
  const admin       = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db          = supabase as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb     = admin as any

  const today       = new Date()
  const todayDow    = today.getDay()
  const { start: monthStart, end: monthEnd } = getMonthRange()

  // ── 역할별 담당 분반 fetch (아래 병렬 배치와 동시에 실행) ──
  const classesPromise = (async (): Promise<ClassRow[]> => {
    if (role === 'teacher') {
      const { data } = await admin
        .from('class_groups')
        .select('id, name, subject, grade, start_time, end_time, day_of_week')
        .eq('is_active', true).not('day_of_week', 'is', null).order('name')
      return data ?? []
    }
    if (role === 'ta_desk' || role === 'ta_assistant') {
      const { data: allAccess } = await adminDb
        .from('ta_class_access').select('is_all_classes')
        .eq('ta_id', user.id).eq('is_all_classes', true).limit(1)

      if (allAccess && allAccess.length > 0) {
        const { data } = await admin
          .from('class_groups')
          .select('id, name, subject, grade, start_time, end_time, day_of_week')
          .eq('is_active', true).not('day_of_week', 'is', null).order('name')
        return data ?? []
      }
      const { data: access } = await adminDb
        .from('ta_class_access').select('class_id')
        .eq('ta_id', user.id).not('class_id', 'is', null)
      const ids = (access ?? []).map((a: { class_id: string }) => a.class_id)
      if (ids.length > 0) {
        const { data } = await admin
          .from('class_groups')
          .select('id, name, subject, grade, start_time, end_time, day_of_week')
          .in('id', ids).eq('is_active', true).not('day_of_week', 'is', null).order('name')
        return data ?? []
      }
    }
    return []
  })()

  // ── 병렬 fetch ──
  const [noticesRes, openQnaRes, staffUsersRes, extraSchedulesRes, taAccessRes] = await Promise.all([
    db.from('notices')
      .select('id, title, created_at, is_pinned, class_id, class_groups!class_id(name)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('qna_questions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('users')
      .select('id, name, role, is_super_admin')
      .in('role', ['teacher', 'ta_desk', 'ta_assistant'])
      .eq('is_active', true)
      .order('role').order('name'),
    adminDb
      .from('extra_schedules')
      .select('id, title, scheduled_date, start_time, end_time, note')
      .eq('user_id', user.id)
      .gte('scheduled_date', monthStart)
      .lte('scheduled_date', monthEnd)
      .order('scheduled_date').order('start_time'),
    adminDb
      .from('ta_class_access')
      .select('ta_id, class_id, is_all_classes'),
  ])

  // 이번 달 휴강 기록 (본인) — 근무 시간 차감용
  const { data: absenceRows } = await adminDb
    .from('schedule_absences')
    .select('id, class_id, absence_date, note')
    .eq('user_id', user.id)
    .gte('absence_date', monthStart)
    .lte('absence_date', monthEnd)
    .order('absence_date')

  const currentUserIsSuperAdmin =
    ((staffUsersRes.data ?? []).find((u) => u.id === user.id)?.is_super_admin ?? false) as boolean

  // 테스트 이름(test/테스트) 분반·스태프는 관리자에게만 노출
  const classes = (await classesPromise).filter(
    (c) => currentUserIsSuperAdmin || !isTestName(c.name),
  )

  // ── 공지사항 가공 ──
  type NoticeRow = { id: string; title: string; created_at: string; is_pinned: boolean; class_id: string | null; className: string | null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notices: NoticeRow[] = (noticesRes.data ?? []).map((n: any) => ({
    id:        n.id        as string,
    title:     n.title     as string,
    created_at: n.created_at as string,
    is_pinned: (n.is_pinned ?? false) as boolean,
    class_id:  (n.class_id ?? null) as string | null,
    className: ((n.class_groups as { name?: string } | null)?.name ?? null) as string | null,
  }))
    // 테스트 분반 대상 공지는 관리자에게만 (제목 기준 필터는 일반 공지 오탐 위험이 있어 분반명만)
    .filter((n: NoticeRow) => currentUserIsSuperAdmin || !n.className || !isTestName(n.className))

  const openQnaCount = openQnaRes.count ?? 0

  // ── TA 수 계산 ──
  const taAccessRows = (taAccessRes.data ?? []) as {
    ta_id: string; class_id: string | null; is_all_classes: boolean
  }[]
  const allClassesTaIds = new Set(
    taAccessRows.filter((r) => r.is_all_classes).map((r) => r.ta_id),
  )
  const allClassesTaCount = allClassesTaIds.size
  const taCountByClass = new Map<string, number>()
  for (const row of taAccessRows) {
    if (row.class_id && !row.is_all_classes) {
      taCountByClass.set(row.class_id, (taCountByClass.get(row.class_id) ?? 0) + 1)
    }
  }

  // ── 오늘 수업 ──
  const todayClasses = classes
    .filter((c) => c.day_of_week?.includes(todayDow) && c.start_time && c.end_time)
    .sort((a, b) => a.start_time!.localeCompare(b.start_time!))

  // ── 스태프 + 상태 ──
  const staffIds = (staffUsersRes.data ?? []).map((u) => u.id as string)
  const { data: statusRows } = staffIds.length > 0
    ? await adminDb
        .from('staff_status')
        .select('user_id, status, updated_at')
        .in('user_id', staffIds)
    : { data: [] as { user_id: string; status: string; updated_at: string }[] }

  const statusMap: Record<string, { status: string; updatedAt: string }> = {}
  for (const row of (statusRows ?? []) as { user_id: string; status: string; updated_at: string }[]) {
    statusMap[row.user_id] = { status: row.status, updatedAt: row.updated_at }
  }

  const initialStaff = (staffUsersRes.data ?? [])
    // 테스트 계정은 관리자에게만 노출 (본인 계정은 항상 표시)
    .filter((u) => currentUserIsSuperAdmin || u.id === user.id || !isTestName(u.name as string))
    .map((u) => ({
      userId:    u.id   as string,
      name:      u.name as string,
      role:      u.role as string,
      isSuperAdmin: (u.is_super_admin ?? false) as boolean,
      status:    toStatus(statusMap[u.id as string]?.status),
      updatedAt: statusMap[u.id as string]?.updatedAt ?? null,
    }))

  const roleLabel = currentUserIsSuperAdmin ? '관리자' : role === 'teacher' ? '선생님' : '조교'

  return (
    <div className="space-y-6">

      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold text-zinc-950">
          안녕하세요, {displayName}님
          {role && displayName !== roleLabel && (
            <span className="ml-2 text-sm font-normal text-zinc-400">({roleLabel})</span>
          )}
        </h1>
        <p className="mt-0.5 text-sm text-zinc-400">
          {today.toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
          })}
        </p>
      </div>

      {/* 미답변 질문 */}
      <div className={[
        'rounded-2xl border p-5 flex items-center justify-between',
        openQnaCount > 0
          ? 'border-zinc-900 bg-zinc-950'
          : 'border-zinc-200 bg-white',
      ].join(' ')}>
        <div>
          <p className="text-xs font-medium text-zinc-400">미답변 질문</p>
          <p className={`mt-1 text-3xl font-bold ${openQnaCount > 0 ? 'text-white' : 'text-zinc-900'}`}>
            {openQnaCount}
            <span className={`ml-1 text-sm font-normal ${openQnaCount > 0 ? 'text-zinc-400' : 'text-zinc-500'}`}>
              건
            </span>
          </p>
        </div>
        <Link
          href="/admin/qna?status=open"
          className={[
            'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
            openQnaCount > 0
              ? 'bg-white/10 text-white hover:bg-white/20'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
          ].join(' ')}
        >
          질의응답 →
        </Link>
      </div>

      {/* 오늘 수업 현황 */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">오늘 수업 현황</h2>
          <span className="text-xs text-zinc-400">
            {today.toLocaleDateString('ko-KR', { weekday: 'long' })}
          </span>
        </div>
        {todayClasses.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-zinc-400">오늘 예정된 수업이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {todayClasses.map((cls) => {
              const taCount = (taCountByClass.get(cls.id) ?? 0) + allClassesTaCount
              return (
                <li key={cls.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900">{cls.name}</p>
                    <p className="text-xs text-zinc-400">{cls.subject}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-zinc-700">
                      {cls.start_time!.slice(0, 5)} – {cls.end_time!.slice(0, 5)}
                    </p>
                    {taCount > 0 && (
                      <p className="text-xs text-zinc-400">조교 {taCount}명</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* 최근 공지사항 */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">최근 공지사항</h2>
          <Link
            href="/admin/notices"
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            더보기 →
          </Link>
        </div>
        {notices.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-zinc-400">등록된 공지사항이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {notices.map((n) => (
              <li key={n.id} className="flex items-center gap-2 px-5 py-3">
                {n.is_pinned && (
                  <span className="shrink-0 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    고정
                  </span>
                )}
                <span className="flex-1 truncate text-sm text-zinc-800">{n.title}</span>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">
                  {n.class_id ? (n.className ?? '분반') : '전체'}
                </span>
                <span className="shrink-0 text-xs text-zinc-400">{formatDate(n.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 주간 시간표 + 추가 근무 + 스태프 현황 (클라이언트 — Realtime) */}
      <DashboardScheduleClient
        classes={classes}
        extraSchedules={extraSchedulesRes.data ?? []}
        absences={absenceRows ?? []}
        initialStaff={initialStaff}
        currentUserId={user.id}
        currentUserRole={role ?? ''}
        currentUserIsSuperAdmin={currentUserIsSuperAdmin}
        myInitialStatus={toStatus(statusMap[user.id]?.status)}
      />
    </div>
  )
}
