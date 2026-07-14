import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ProgressClient } from './_components/progress-client'

export default async function AssignmentProgressPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: assignment } = await supabase
    .from('assignments')
    .select('id, title, category, due_date, week_num, class_id, class_groups!class_id(name)')
    .eq('id', id)
    .single()

  if (!assignment) notFound()

  const className = (assignment.class_groups as { name: string } | null)?.name ?? ''

  const { data: members } = await supabase
    .from('class_members')
    .select('student_id, users!student_id(name)')
    .eq('class_id', assignment.class_id)
    .eq('is_active', true)

  const students = (members ?? []).map((m) => ({
    id: m.student_id as string,
    name: (m.users as { name: string } | null)?.name ?? '',
  })).sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  // before_enrollment은 생성 타입에 아직 없는 컬럼(067 추가)이라 캐스팅으로 접근.
  // 마이그레이션 미적용 환경에서도 기존 진행률이 안 보이는 회귀가 없도록 실패 시 폴백 조회.
  type ProgressRow = { student_id: string; completion_pct: number | null; submit_date: string | null; before_enrollment?: boolean | null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: progressRows, error: progressError } = (await (supabase as any)
    .from('assignment_progress')
    .select('student_id, completion_pct, submit_date, before_enrollment')
    .eq('assignment_id', id)) as unknown as { data: ProgressRow[] | null; error: { code?: string } | null }

  if (progressError?.code === 'PGRST204' || progressError?.code === '42703') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;({ data: progressRows } = (await (supabase as any)
      .from('assignment_progress')
      .select('student_id, completion_pct, submit_date')
      .eq('assignment_id', id)) as unknown as { data: ProgressRow[] | null })
  }

  const existingProgress: Record<string, number | null> = {}
  const existingSubmitDates: Record<string, string> = {}
  const existingBeforeEnrollment: Record<string, boolean> = {}
  for (const p of progressRows ?? []) {
    existingProgress[p.student_id] = p.completion_pct ?? null
    if (p.submit_date) existingSubmitDates[p.student_id] = p.submit_date
    if (p.before_enrollment) existingBeforeEnrollment[p.student_id] = true
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/assignments"
          className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
          과제 목록
        </Link>
        <h1 className="text-xl font-bold text-zinc-950">{assignment.title}</h1>
        <div className="mt-1 flex flex-wrap gap-3 text-sm text-zinc-500">
          <span>{className}</span>
          {assignment.category && <span>·  {assignment.category}</span>}
          {assignment.week_num != null && <span>· {assignment.week_num}주차</span>}
          {assignment.due_date && <span>· 마감 {assignment.due_date}</span>}
        </div>
      </div>

      {/* key: 다른 과제로 이동 시 리마운트 — 이전 과제의 입력 상태가 남지 않도록 */}
      <ProgressClient
        key={id}
        assignmentId={id}
        dueDate={assignment.due_date as string | null}
        students={students}
        existingProgress={existingProgress}
        existingSubmitDates={existingSubmitDates}
        existingBeforeEnrollment={existingBeforeEnrollment}
      />
    </div>
  )
}
