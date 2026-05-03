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

  const className = ((assignment.class_groups as unknown as { name: string } | null))?.name ?? ''

  const { data: members } = await supabase
    .from('class_members')
    .select('student_id, users!student_id(name)')
    .eq('class_id', assignment.class_id)
    .eq('is_active', true)

  const students = (members ?? []).map((m) => ({
    id: m.student_id as string,
    name: ((m.users as unknown as { name: string } | null)?.name ?? '') as string,
  })).sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  const { data: progressRows } = await supabase
    .from('assignment_progress')
    .select('student_id, completion_pct')
    .eq('assignment_id', id)

  const existingProgress: Record<string, number> = {}
  for (const p of progressRows ?? []) {
    existingProgress[p.student_id as string] = (p.completion_pct ?? 0) as number
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

      <ProgressClient
        assignmentId={id}
        dueDate={assignment.due_date as string | null}
        students={students}
        existingProgress={existingProgress}
      />
    </div>
  )
}
