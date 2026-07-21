import { createClient } from '@/lib/supabase/server'
import { getVisibleClassOptions } from '@/lib/data/class-options'
import { ExamResultsClient } from './_components/exam-results-client'

export default async function ExamResultsPage() {
  const supabase = await createClient()

  const [classOptions, membersResult, resultsResult, examReportsResult] = await Promise.all([
    getVisibleClassOptions(),
    supabase
      .from('class_members')
      .select('class_id, student_id, users!student_id(name, school, grade)')
      .eq('is_active', true),
    // exam_difficulty는 생성 타입에 아직 없는 컬럼(072 추가)이라 실패 시 폴백 조회 —
    // 마이그레이션 미적용 환경에서도 시험 결과 목록 자체가 안 보이는 회귀가 없도록 한다.
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (supabase as any)
        .from('exam_results')
        .select(
          'id, exam_name, exam_type, exam_date, score, max_score, grade_cuts, study_suggestion, exam_difficulty, student_id, class_id, rank_in_exam, total_in_exam, auto_rank, estimated_grade, estimated_percentile, users!student_id(name, school, grade), class_groups!class_id(name)',
        )
        .order('exam_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (res.error?.code === 'PGRST204' || res.error?.code === '42703') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (supabase as any)
          .from('exam_results')
          .select(
            'id, exam_name, exam_type, exam_date, score, max_score, grade_cuts, study_suggestion, student_id, class_id, rank_in_exam, total_in_exam, auto_rank, estimated_grade, estimated_percentile, users!student_id(name, school, grade), class_groups!class_id(name)',
          )
          .order('exam_date', { ascending: false })
          .order('created_at', { ascending: false })
      }
      return res
    })(),
    // exam_reports는 생성 타입에 아직 없는 테이블(071 추가)이라 캐스팅으로 접근.
    // 마이그레이션 미적용 환경에서는 data가 null로 와서 아래에서 빈 목록으로 처리된다
    // (특별 시험 관리 페이지 자체는 깨지지 않음).
    (supabase as any)
      .from('exam_reports')
      .select('exam_result_id, image_url') as unknown as Promise<{
        data: Array<{ exam_result_id: string; image_url: string | null }> | null
      }>,
  ])

  const classes = classOptions.map((c) => ({ id: c.id, name: c.name }))
  const visibleClassNames = new Set(classes.map((c) => c.name))

  // (학생, 분반) 쌍 단위로 구성 — 여러 분반 소속 학생도 각 분반에서 검색되도록
  const students: { id: string; name: string; classId: string; school: string; grade: string }[] = []
  const seenPair = new Set<string>()
  for (const m of membersResult.data ?? []) {
    const sid = m.student_id as string
    const cid = m.class_id as string
    const key = `${sid}__${cid}`
    if (seenPair.has(key)) continue
    seenPair.add(key)
    const u = m.users as { name: string; school: string | null; grade: string | null } | null
    if (u?.name) {
      students.push({ id: sid, name: u.name, classId: cid, school: u.school ?? '', grade: u.grade ?? '' })
    }
  }
  students.sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  const reportImageByExamResult: Record<string, string> = {}
  for (const r of examReportsResult.data ?? []) {
    if (r.image_url) reportImageByExamResult[r.exam_result_id] = r.image_url
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = ((resultsResult.data ?? []) as any[])
    // 드롭다운과 일관성: 보이지 않는 분반(테스트 분반 등)의 결과는 목록에서도 제외
    .filter((r) => {
      const cn = (r.class_groups as { name: string } | null)?.name
      return !cn || visibleClassNames.has(cn)
    })
    .map((r) => {
      const u = r.users as { name: string; school: string | null; grade: string | null } | null
      return {
        id: r.id as string,
        studentId: r.student_id as string,
        studentName: u?.name ?? '',
        studentSchool: u?.school ?? '',
        studentGrade: u?.grade ?? '',
        className: (r.class_groups as { name: string } | null)?.name ?? '',
        examName: r.exam_name as string,
        examType: r.exam_type as string,
        examDate: r.exam_date as string,
        score: r.score as number,
        maxScore: r.max_score as number,
        gradeCuts: (r.grade_cuts ?? {}) as Record<string, number>,
        studySuggestion: r.study_suggestion as string | null,
        examDifficulty: (r.exam_difficulty ?? null) as string | null,
        rankInExam: r.rank_in_exam as number | null,
        totalInExam: r.total_in_exam as number | null,
        autoRank: r.auto_rank as boolean,
        estimatedGrade: r.estimated_grade as string | null,
        estimatedPercentile: r.estimated_percentile as number | null,
        reportImageUrl: reportImageByExamResult[r.id as string] ?? null,
      }
    })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-950">특별 시험 관리</h1>
        <p className="mt-0.5 text-sm text-zinc-400">
          특별시험 레포트로 관리할 시험만 등록하세요 — 등급·등수·예측등급처럼 개별 분석이 필요한 모의고사·중간고사·기말고사 등의 경우입니다.
        </p>
      </div>
      <ExamResultsClient
        classes={classes}
        students={students}
        results={results}
      />
    </div>
  )
}
