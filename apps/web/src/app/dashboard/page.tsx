import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DdayCard } from './_components/dday-card'

// 수능 기본 날짜
const CSAT_DEFAULT = '2026-11-19'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 현재 유저의 public.users row
  const { data: profile } = await supabase
    .from('users')
    .select('id, name')
    .eq('id', user!.id)
    .single()

  const userId = profile?.id ?? user!.id

  // 소속 반 ID 목록
  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('student_id', userId)
    .eq('is_active', true)

  const classIds = memberships?.map((m) => m.class_id) ?? []

  // 과제 미리보기 (최근 3개)
  const { data: assignments } = classIds.length
    ? await supabase
        .from('assignments')
        .select('id, title, due_date, category')
        .in('class_id', classIds)
        .order('due_date', { ascending: true })
        .limit(3)
    : { data: [] }

  // 공지사항 (고정 + 최근 2개)
  const { data: notices } = classIds.length
    ? await supabase
        .from('notices')
        .select('id, title, created_at, is_pinned')
        .or(`class_id.is.null,class_id.in.(${classIds.join(',')})`)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3)
    : await supabase
        .from('notices')
        .select('id, title, created_at, is_pinned')
        .is('class_id', null)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3)

  // 최근 질문 (본인 것, 최근 3개)
  const { data: questions } = await supabase
    .from('qna_questions')
    .select('id, content, status, created_at')
    .eq('student_id', userId)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <div className="space-y-4">

      {/* D-day 카드 (클라이언트 — 날짜 설정 인터랙션) */}
      <DdayCard defaultDate={CSAT_DEFAULT} />

      {/* 오늘의 학습 계획 */}
      <Card>
        <CardHeader
          title="오늘의 학습 계획"
          action={<Link href="/dashboard/learning" className="hover:text-zinc-700">전체 보기</Link>}
        />
        <div className="px-5 pb-5">
          {assignments && assignments.length > 0 ? (
            <ul className="space-y-2.5">
              {assignments.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                    <span className="truncate text-sm text-zinc-800">{a.title}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {a.category && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">
                        {a.category}
                      </span>
                    )}
                    {a.due_date && (
                      <span className="text-[10px] text-zinc-400">
                        {new Date(a.due_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="등록된 과제가 없습니다." />
          )}
        </div>
      </Card>

      {/* 공지사항 */}
      <Card>
        <CardHeader
          title="공지사항"
          action={<Link href="/dashboard/more" className="hover:text-zinc-700">전체 보기</Link>}
        />
        <div className="px-5 pb-5">
          {notices && notices.length > 0 ? (
            <ul className="divide-y divide-zinc-100">
              {notices.map((n) => (
                <li key={n.id} className="flex items-center gap-2 py-2.5">
                  {n.is_pinned && (
                    <span className="shrink-0 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      고정
                    </span>
                  )}
                  <span className="flex-1 truncate text-sm text-zinc-800">{n.title}</span>
                  <span className="shrink-0 text-[10px] text-zinc-400">
                    {new Date(n.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
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
            <Link href="/dashboard/learning#qna" className="hover:text-zinc-700">
              질문하기
            </Link>
          }
        />
        <div className="px-5 pb-5">
          {questions && questions.length > 0 ? (
            <ul className="space-y-2.5">
              {questions.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-3">
                  <span className="flex-1 truncate text-sm text-zinc-800">{q.content}</span>
                  <StatusBadge status={q.status} />
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
  const map: Record<string, { label: string; className: string }> = {
    open:        { label: '대기', className: 'bg-zinc-100 text-zinc-500' },
    in_progress: { label: '답변중', className: 'bg-zinc-900 text-white' },
    answered:    { label: '완료', className: 'bg-zinc-200 text-zinc-600' },
  }
  const { label, className } = map[status] ?? { label: status, className: 'bg-zinc-100 text-zinc-500' }
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${className}`}>
      {label}
    </span>
  )
}
