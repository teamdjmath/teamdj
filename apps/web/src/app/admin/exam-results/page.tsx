import { createClient } from '@/lib/supabase/server'
import { getVisibleClassOptions } from '@/lib/data/class-options'
import { ExamResultsClient } from './_components/exam-results-client'

export default async function ExamResultsPage() {
  const supabase = await createClient()

  const [classOptions, membersResult, resultsResult] = await Promise.all([
    getVisibleClassOptions(),
    supabase
      .from('class_members')
      .select('class_id, student_id, users!student_id(name)')
      .eq('is_active', true),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('exam_results')
      .select(
        'id, exam_name, exam_type, exam_date, score, max_score, grade_cuts, study_suggestion, student_id, class_id, rank_in_exam, total_in_exam, auto_rank, users!student_id(name), class_groups!class_id(name)',
      )
      .order('exam_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const classes = classOptions.map((c) => ({ id: c.id, name: c.name }))

  const students: { id: string; name: string; classId: string }[] = []
  const seen = new Set<string>()
  for (const m of membersResult.data ?? []) {
    const sid = m.student_id as string
    if (seen.has(sid)) continue
    seen.add(sid)
    const u = m.users as { name: string } | null
    if (u?.name) {
      students.push({ id: sid, name: u.name, classId: m.class_id as string })
    }
  }
  students.sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = ((resultsResult.data ?? []) as any[]).map((r) => ({
    id: r.id as string,
    studentName: (r.users as { name: string } | null)?.name ?? '',
    className: (r.class_groups as { name: string } | null)?.name ?? '',
    examName: r.exam_name as string,
    examType: r.exam_type as string,
    examDate: r.exam_date as string,
    score: r.score as number,
    maxScore: r.max_score as number,
    gradeCuts: (r.grade_cuts ?? {}) as Record<string, number>,
    studySuggestion: r.study_suggestion as string | null,
    rankInExam: r.rank_in_exam as number | null,
    totalInExam: r.total_in_exam as number | null,
    autoRank: r.auto_rank as boolean,
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
