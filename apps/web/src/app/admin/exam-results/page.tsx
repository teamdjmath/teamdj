import { createClient } from '@/lib/supabase/server'
import { ExamResultsClient } from './_components/exam-results-client'

export default async function ExamResultsPage() {
  const supabase = await createClient()

  const [classesResult, membersResult, resultsResult] = await Promise.all([
    supabase
      .from('class_groups')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('class_members')
      .select('class_id, student_id, users!student_id(name)')
      .eq('is_active', true),
    supabase
      .from('exam_results')
      .select(
        'id, exam_name, exam_type, exam_date, score, max_score, grade_cuts, study_suggestion, student_id, class_id, users!student_id(name), class_groups!class_id(name)',
      )
      .order('exam_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const classes = (classesResult.data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
  }))

  const students: { id: string; name: string; classId: string }[] = []
  const seen = new Set<string>()
  for (const m of membersResult.data ?? []) {
    const sid = m.student_id as string
    if (seen.has(sid)) continue
    seen.add(sid)
    const u = m.users as unknown as { name: string } | null
    if (u?.name) {
      students.push({ id: sid, name: u.name, classId: m.class_id as string })
    }
  }
  students.sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  const results = (resultsResult.data ?? []).map((r) => ({
    id: r.id as string,
    studentName: ((r.users as unknown as { name: string } | null)?.name ?? '') as string,
    className: ((r.class_groups as unknown as { name: string } | null)?.name ?? '') as string,
    examName: r.exam_name as string,
    examType: r.exam_type as string,
    examDate: r.exam_date as string,
    score: r.score as number,
    maxScore: r.max_score as number,
    gradeCuts: (r.grade_cuts ?? {}) as Record<string, number>,
    studySuggestion: r.study_suggestion as string | null,
  }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-950">특별 시험 관리</h1>
        <p className="mt-0.5 text-sm text-zinc-400">모의고사·중간고사·기말고사 결과를 등록하고 관리하세요.</p>
      </div>
      <ExamResultsClient
        classes={classes}
        students={students}
        results={results}
      />
    </div>
  )
}
