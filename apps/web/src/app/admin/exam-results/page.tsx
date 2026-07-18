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
        'id, exam_name, exam_type, exam_date, score, max_score, grade_cuts, study_suggestion, student_id, class_id, rank_in_exam, total_in_exam, auto_rank, estimated_grade, estimated_percentile, users!student_id(name), class_groups!class_id(name)',
      )
      .order('exam_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const classes = classOptions.map((c) => ({ id: c.id, name: c.name }))
  const visibleClassNames = new Set(classes.map((c) => c.name))

  // (학생, 분반) 쌍 단위로 구성 — 여러 분반 소속 학생도 각 분반에서 검색되도록
  const students: { id: string; name: string; classId: string }[] = []
  const seenPair = new Set<string>()
  for (const m of membersResult.data ?? []) {
    const sid = m.student_id as string
    const cid = m.class_id as string
    const key = `${sid}__${cid}`
    if (seenPair.has(key)) continue
    seenPair.add(key)
    const u = m.users as { name: string } | null
    if (u?.name) {
      students.push({ id: sid, name: u.name, classId: cid })
    }
  }
  students.sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = ((resultsResult.data ?? []) as any[])
    // 드롭다운과 일관성: 보이지 않는 분반(테스트 분반 등)의 결과는 목록에서도 제외
    .filter((r) => {
      const cn = (r.class_groups as { name: string } | null)?.name
      return !cn || visibleClassNames.has(cn)
    })
    .map((r) => ({
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
    estimatedGrade: r.estimated_grade as string | null,
    estimatedPercentile: r.estimated_percentile as number | null,
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
