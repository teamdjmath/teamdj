import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  // ── 모든 데이터 동시 페칭 (워터폴 방지)
  const [
    { count: totalStudents },
    { data: todayAttendance },
    { count: openQnaCount },
    { data: notices }
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('is_active', true),
    supabase
      .from('attendance_logs')
      .select('status')
      .eq('session_date', today),
    supabase
      .from('qna_questions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('notices')
      .select('id, title, created_at, is_pinned')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5)
  ])

  const presentCount = todayAttendance?.filter((a) => a.status === 'present').length ?? 0
  const absentCount  = todayAttendance?.filter((a) => a.status === 'absent').length ?? 0
  const lateCount    = todayAttendance?.filter((a) => a.status === 'late').length ?? 0
  const totalChecked = todayAttendance?.length ?? 0

  const displayName = user?.user_metadata?.name ?? user?.email ?? ''
  const role = user?.user_metadata?.role as string | undefined

  return (
    <div className="space-y-6">

      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-xl font-bold text-zinc-950">
          안녕하세요, {displayName}
          {role && (
            <span className="ml-2 text-sm font-normal text-zinc-400">
              ({role === 'teacher' ? '선생님' : '조교'})
            </span>
          )}
        </h1>
        <p className="mt-0.5 text-sm text-zinc-400">
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
        </p>
      </div>

      {/* 통계 카드 그리드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="전체 학생"
          value={totalStudents ?? 0}
          unit="명"
        />
        <StatCard
          label="오늘 출석"
          value={presentCount}
          unit="명"
          sub={totalChecked > 0 ? `총 ${totalChecked}명 체크` : '미체크'}
        />
        <StatCard
          label="결석 · 지각"
          value={absentCount + lateCount}
          unit="명"
          sub={lateCount > 0 ? `지각 ${lateCount}명 포함` : undefined}
        />
        <StatCard
          label="미답변 질문"
          value={openQnaCount ?? 0}
          unit="건"
          highlight={(openQnaCount ?? 0) > 0}
        />
      </div>

      {/* 출석 현황 바 */}
      {totalChecked > 0 && (
        <Card>
          <CardHeader title="오늘 출석 현황" />
          <div className="px-5 pb-5 space-y-3">
            <AttendanceBar
              present={presentCount}
              absent={absentCount}
              late={lateCount}
            />
            <div className="flex gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-zinc-900 inline-block" />
                출석 {presentCount}명
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-zinc-400 inline-block" />
                결석 {absentCount}명
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-zinc-300 inline-block" />
                지각 {lateCount}명
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* 최근 공지사항 */}
      <Card>
        <CardHeader title="최근 공지사항" />
        <div className="px-5 pb-5">
          {notices && notices.length > 0 ? (
            <ul className="divide-y divide-zinc-100">
              {notices.map((n) => (
                <li key={n.id} className="flex items-center gap-2 py-3">
                  {n.is_pinned && (
                    <span className="shrink-0 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      고정
                    </span>
                  )}
                  <span className="flex-1 truncate text-sm text-zinc-800">{n.title}</span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {new Date(n.created_at).toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="등록된 공지사항이 없습니다." />
          )}
        </div>
      </Card>
    </div>
  )
}

// ── 통계 카드
function StatCard({
  label,
  value,
  unit,
  sub,
  highlight = false,
}: {
  label: string
  value: number
  unit: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div
      className={[
        'rounded-2xl border p-4',
        highlight
          ? 'border-zinc-900 bg-zinc-950 text-white'
          : 'border-zinc-200 bg-white text-zinc-900',
      ].join(' ')}
    >
      <p className={`text-xs font-medium ${highlight ? 'text-zinc-400' : 'text-zinc-400'}`}>
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold">
        {value}
        <span className={`ml-1 text-sm font-normal ${highlight ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {unit}
        </span>
      </p>
      {sub && (
        <p className={`mt-1 text-[10px] ${highlight ? 'text-zinc-500' : 'text-zinc-400'}`}>{sub}</p>
      )}
    </div>
  )
}

// ── 출석 비율 바
function AttendanceBar({
  present,
  absent,
  late,
}: {
  present: number
  absent: number
  late: number
}) {
  const total = present + absent + late
  if (total === 0) return null

  const pPct = Math.round((present / total) * 100)
  const aPct = Math.round((absent  / total) * 100)
  const lPct = 100 - pPct - aPct

  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
      <div className="bg-zinc-900 transition-all" style={{ width: `${pPct}%` }} />
      <div className="bg-zinc-400 transition-all" style={{ width: `${aPct}%` }} />
      <div className="bg-zinc-300 transition-all" style={{ width: `${lPct}%` }} />
    </div>
  )
}
