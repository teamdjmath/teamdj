import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DdayCard } from './_components/dday-card'

const CSAT_DEFAULT = '2026-11-19'
const TODAY = new Date().toISOString().split('T')[0]

// 카테고리별 색상
const CATEGORY_STYLE: Record<string, string> = {
  '매월승리': 'bg-zinc-950 text-white',
  'KBS':      'bg-zinc-700 text-white',
  'EB-Schema':'bg-zinc-400 text-white',
}

function catStyle(cat: string | null) {
  return cat ? (CATEGORY_STYLE[cat] ?? 'bg-zinc-100 text-zinc-500') : 'bg-zinc-100 text-zinc-500'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user!.id

  // 소속 반 ID 목록
  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('student_id', userId)
    .eq('is_active', true)

  const classIds = (memberships ?? []).map((m) => m.class_id as string)

  // 오늘의 과제 (마감일 >= 오늘, 최대 5개)
  const assignmentsQuery = classIds.length
    ? supabase
        .from('assignments')
        .select('id, title, due_date, category')
        .in('class_id', classIds)
        .gte('due_date', TODAY)
        .order('due_date', { ascending: true })
        .limit(5)
    : null

  const { data: assignments } = assignmentsQuery
    ? await assignmentsQuery
    : { data: [] }

  // 과제 진행률
  const assignmentIds = (assignments ?? []).map((a) => a.id as string)
  const { data: progressRows } = assignmentIds.length
    ? await supabase
        .from('assignment_progress')
        .select('assignment_id, completion_pct')
        .eq('student_id', userId)
        .in('assignment_id', assignmentIds)
    : { data: [] }

  const progressMap: Record<string, number> = {}
  for (const p of progressRows ?? []) {
    progressMap[p.assignment_id as string] = (p.completion_pct ?? 0) as number
  }

  // 공지사항 (고정 + 최근 3개, 내 반 + 전체)
  const noticesQuery = classIds.length
    ? supabase
        .from('notices')
        .select('id, title, created_at, is_pinned')
        .or(`class_id.is.null,class_id.in.(${classIds.join(',')})`)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3)
    : supabase
        .from('notices')
        .select('id, title, created_at, is_pinned')
        .is('class_id', null)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3)

  const { data: notices } = await noticesQuery

  // 최근 질문
  const { data: questions } = await supabase
    .from('qna_questions')
    .select('id, content, status, created_at')
    .eq('student_id', userId)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <div className="space-y-4">
      <DdayCard defaultDate={CSAT_DEFAULT} />

      {/* 오늘의 학습 계획 */}
      <Card>
        <CardHeader
          title="오늘의 학습 계획"
          action={<Link href="/dashboard/learning" className="hover:text-zinc-700">전체 보기</Link>}
        />
        <div className="px-5 pb-5">
          {assignments && assignments.length > 0 ? (
            <ul className="space-y-3">
              {assignments.map((a) => {
                const pct = progressMap[a.id as string] ?? 0
                const isOverdue = a.due_date && (a.due_date as string) < TODAY
                return (
                  <li key={a.id as string}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${catStyle(a.category as string | null)}`}>
                          {(a.category as string) || '기타'}
                        </span>
                        <span className={`truncate text-sm ${isOverdue && pct < 100 ? 'text-red-600' : 'text-zinc-800'}`}>
                          {a.title as string}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-zinc-700">{pct}%</span>
                    </div>
                    {/* 프로그레스 바 */}
                    <div className="h-1.5 w-full rounded-full bg-zinc-100">
                      <div
                        className={`h-1.5 rounded-full transition-all ${pct === 100 ? 'bg-zinc-950' : isOverdue ? 'bg-red-400' : 'bg-zinc-600'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {a.due_date && (
                      <p className={`mt-0.5 text-[10px] ${isOverdue && pct < 100 ? 'text-red-400' : 'text-zinc-400'}`}>
                        마감 {new Date(a.due_date as string).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState message="오늘 마감인 과제가 없습니다." />
          )}
        </div>
      </Card>

      {/* 공지사항 */}
      <Card>
        <CardHeader title="공지사항" />
        <div className="px-5 pb-5">
          {notices && notices.length > 0 ? (
            <ul className="divide-y divide-zinc-100">
              {notices.map((n) => (
                <li key={n.id as string} className="flex items-center gap-2 py-2.5">
                  {(n.is_pinned as boolean) && (
                    <span className="shrink-0 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      고정
                    </span>
                  )}
                  <span className="flex-1 truncate text-sm text-zinc-800">{n.title as string}</span>
                  <span className="shrink-0 text-[10px] text-zinc-400">
                    {new Date(n.created_at as string).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="공지사항이 없습니다." />
          )}
        </div>
      </Card>

      {/* 질의응답 */}
      <Card>
        <CardHeader
          title="질의응답"
          action={
            <Link href="/dashboard/learning" className="hover:text-zinc-700">
              전체 보기
            </Link>
          }
        />
        <div className="px-5 pb-5">
          {questions && questions.length > 0 ? (
            <ul className="divide-y divide-zinc-100">
              {questions.map((q) => (
                <li key={q.id as string} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex-1 truncate text-sm text-zinc-800">{(q.content as string).slice(0, 50)}</span>
                  <StatusBadge status={q.status as string} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="아직 질문이 없습니다." />
          )}
        </div>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open:        { label: '미답변', cls: 'bg-zinc-100 text-zinc-500' },
    in_progress: { label: '답변중', cls: 'bg-zinc-900 text-white' },
    answered:    { label: '답변완료', cls: 'bg-zinc-200 text-zinc-600' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-zinc-100 text-zinc-500' }
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  )
}
