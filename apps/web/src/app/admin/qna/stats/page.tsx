import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type Period = 'week' | 'month' | 'all'

function getPeriodStart(period: Period): string | null {
  const now = new Date()
  if (period === 'week') {
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(now.setDate(diff)).toISOString().split('T')[0]
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  }
  return null
}

function periodLabel(period: Period) {
  if (period === 'week') return '이번 주'
  if (period === 'month') return '이번 달'
  return '전체'
}

export default async function QnaStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.user_metadata?.role !== 'teacher') redirect('/admin/qna')

  const { period: rawPeriod } = await searchParams
  const period: Period =
    rawPeriod === 'week' ? 'week' : rawPeriod === 'all' ? 'all' : 'month'

  const admin = createAdminClient()

  // 스태프 목록 (teacher + ta_admin + ta_assistant)
  const { data: staffList } = await admin
    .from('users')
    .select('id, name, role')
    .in('role', ['teacher', 'ta_admin', 'ta_assistant'])
    .eq('is_active', true)
    .order('role')
    .order('name')

  const staffIds = (staffList ?? []).map((s) => s.id as string)

  // 기간 내 답변 집계 (as any: qna_answers의 created_at은 DB에 존재하나 타입 미생성)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  const periodStart = getPeriodStart(period)
  let answersQuery = db
    .from('qna_answers')
    .select('ta_id, created_at, difficulty, student_rating')
    .in('ta_id', staffIds)

  if (periodStart) {
    answersQuery = answersQuery.gte('created_at', periodStart)
  }

  const { data: answers } = await answersQuery

  // 전체 기간 집계 (비교용)
  const { data: allAnswers } = await db
    .from('qna_answers')
    .select('ta_id, difficulty, student_rating')
    .in('ta_id', staffIds)

  // ta_id 기준 집계
  const periodCount: Record<string, number> = {}
  const totalCount: Record<string, number> = {}
  const diffLow: Record<string, number> = {}   // 0–3
  const diffMid: Record<string, number> = {}   // >3–6
  const diffHigh: Record<string, number> = {}  // >6–10
  const diffSum: Record<string, number> = {}
  const diffSetCount: Record<string, number> = {}
  const diffUnset: Record<string, number> = {}
  const ratingSum: Record<string, number> = {}
  const ratingCount: Record<string, number> = {}

  for (const row of answers ?? []) {
    const id = row.ta_id as string
    periodCount[id] = (periodCount[id] ?? 0) + 1
  }
  for (const row of allAnswers ?? []) {
    const id = row.ta_id as string
    totalCount[id] = (totalCount[id] ?? 0) + 1
    const d = row.difficulty as number | null
    if (d === null || d === undefined) {
      diffUnset[id] = (diffUnset[id] ?? 0) + 1
    } else {
      diffSum[id] = (diffSum[id] ?? 0) + d
      diffSetCount[id] = (diffSetCount[id] ?? 0) + 1
      if (d <= 4) diffLow[id] = (diffLow[id] ?? 0) + 1
      else if (d <= 6) diffMid[id] = (diffMid[id] ?? 0) + 1
      else diffHigh[id] = (diffHigh[id] ?? 0) + 1
    }
    const rating = row.student_rating as number | null
    if (rating != null) {
      ratingSum[id] = (ratingSum[id] ?? 0) + rating
      ratingCount[id] = (ratingCount[id] ?? 0) + 1
    }
  }

  const rows = (staffList ?? [])
    .map((s) => {
      const sid = s.id as string
      const setCount = diffSetCount[sid] ?? 0
      return {
        id: sid,
        name: s.name as string,
        role: s.role as string,
        periodCount: periodCount[sid] ?? 0,
        totalCount: totalCount[sid] ?? 0,
        diffLow: diffLow[sid] ?? 0,
        diffMid: diffMid[sid] ?? 0,
        diffHigh: diffHigh[sid] ?? 0,
        diffAvg: setCount > 0 ? (diffSum[sid] ?? 0) / setCount : null,
        diffUnset: diffUnset[sid] ?? 0,
        avgRating: (ratingCount[sid] ?? 0) > 0 ? (ratingSum[sid] ?? 0) / ratingCount[sid] : null,
        ratedCount: ratingCount[sid] ?? 0,
      }
    })
    .sort((a, b) => b.periodCount - a.periodCount)

  const PERIODS: Period[] = ['week', 'month', 'all']

  function roleLabel(role: string) {
    if (role === 'teacher') return '선생님'
    if (role === 'ta_admin') return '사무 조교'
    if (role === 'ta_assistant') return '첨삭 조교'
    return role
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-950">답변 통계</h1>
        <p className="mt-0.5 text-sm text-zinc-400">조교별 질문 답변 현황</p>
      </div>

      {/* 기간 필터 */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/admin/qna/stats?period=${p}`}
            className={[
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              period === p
                ? 'bg-zinc-950 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
            ].join(' ')}
          >
            {periodLabel(p)}
          </Link>
        ))}
      </div>

      {/* 통계 테이블 */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">이름</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">역할</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">
                {periodLabel(period)} 답변
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">전체 답변</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">하 (1–4)</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">중 (5–6)</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">상 (7–8)</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">평균</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">미설정</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">학생 별점</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-5 py-10 text-center text-sm text-zinc-400">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-zinc-900">
                    <span className="inline-flex items-center gap-2">
                      {idx === 0 && r.periodCount > 0 && (
                        <span className="text-[10px] font-bold text-zinc-400">1위</span>
                      )}
                      {r.name}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 text-xs">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium">
                      {roleLabel(r.role)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`font-bold ${r.periodCount > 0 ? 'text-zinc-950' : 'text-zinc-300'}`}>
                      {r.periodCount}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-zinc-500">{r.totalCount}</td>
                  <td className="px-5 py-3.5 text-right text-zinc-500">{r.diffLow || '—'}</td>
                  <td className="px-5 py-3.5 text-right text-zinc-500">{r.diffMid || '—'}</td>
                  <td className="px-5 py-3.5 text-right text-zinc-500">{r.diffHigh || '—'}</td>
                  <td className="px-5 py-3.5 text-right text-zinc-500">
                    {r.diffAvg !== null ? r.diffAvg.toFixed(2) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right text-zinc-400 text-xs">{r.diffUnset || '—'}</td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    {r.avgRating != null ? (
                      <span className="font-semibold text-yellow-600">
                        ★ {r.avgRating.toFixed(1)}
                        <span className="ml-1 text-xs font-normal text-zinc-400">({r.ratedCount}건)</span>
                      </span>
                    ) : (
                      <span className="text-zinc-300 text-xs">아직 없음</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t border-zinc-100 bg-zinc-50">
              <tr>
                <td colSpan={2} className="px-5 py-3 text-xs font-semibold text-zinc-500">합계</td>
                <td className="px-5 py-3 text-right text-xs font-bold text-zinc-950">
                  {rows.reduce((s, r) => s + r.periodCount, 0)}
                </td>
                <td className="px-5 py-3 text-right text-xs text-zinc-500">
                  {rows.reduce((s, r) => s + r.totalCount, 0)}
                </td>
                <td className="px-5 py-3 text-right text-xs text-zinc-500">
                  {rows.reduce((s, r) => s + r.diffLow, 0) || '—'}
                </td>
                <td className="px-5 py-3 text-right text-xs text-zinc-500">
                  {rows.reduce((s, r) => s + r.diffMid, 0) || '—'}
                </td>
                <td className="px-5 py-3 text-right text-xs text-zinc-500">
                  {rows.reduce((s, r) => s + r.diffHigh, 0) || '—'}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="text-xs text-zinc-400">
        * 기간 기준: {period === 'week' ? '이번 주 월요일 00:00 이후' : period === 'month' ? '이번 달 1일 00:00 이후' : '전체 기간'}
      </p>
    </div>
  )
}
