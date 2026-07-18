import { createClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { gradeFromScore } from '@/lib/grade'
import { ScoreChart } from './_components/score-chart'
import { ReportList } from './_components/report-list'
import { ExamResultsList } from './_components/exam-results-list'

export default async function ReportPage() {
  const supabase = await createClient()
  const user = await getVerifiedUser()
  const userId = user!.id

  // 휴원 확인
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dbUser } = await (supabase as any).from('users').select('suspended_from, suspended_until').eq('id', userId).single()
  const today = new Date().toISOString().slice(0, 10)
  const suspFrom = dbUser?.suspended_from as string | null
  const suspUntil = dbUser?.suspended_until as string | null
  const isSuspended = !!(suspFrom && suspUntil && suspFrom <= today && today <= suspUntil)

  if (isSuspended) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-zinc-950">리포트</h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
          <p className="text-sm font-semibold text-amber-800">휴원 중에는 성적 리포트를 조회할 수 없습니다.</p>
          <p className="mt-1 text-xs text-amber-700">
            종료일: {suspUntil ? new Date(suspUntil).toLocaleDateString('ko-KR') : ''} 이후 이용 가능합니다.
          </p>
        </div>
      </div>
    )
  }

  const [reportsResult, scoresResult, examResultsResult] = await Promise.all([
    supabase
      .from('reports')
      .select('id, created_at, image_url, class:class_groups!class_id(name)')
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('test_scores')
      .select('score, tests!test_id!inner(test_date, max_score, title)')
      .eq('student_id', userId)
      .in('tests.exam_type', ['모의고사', '중간고사', '기말고사'])
      .order('tests(test_date)', { ascending: true })
      .limit(10),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('exam_results')
      .select('id, exam_name, exam_type, exam_date, score, max_score, grade_cuts, rank_in_exam, total_in_exam, auto_rank, study_suggestion')
      .eq('student_id', userId)
      .order('exam_date', { ascending: false })
      .limit(20),
  ])

  const reports = reportsResult.data ?? []
  const scores = scoresResult.data ?? []

  const scoreData = scores
    .filter((s) => s.score !== null) // 미응시 기록은 추이 그래프에서 제외
    .map((s) => {
      const t = s.tests as { test_date: string; max_score: number; title: string } | null
      return {
        date:     t?.test_date ?? '',
        score:    s.score ?? 0,
        maxScore: t?.max_score ?? 100,
        label:    t?.title ?? '',
      }
    })

  const reportItems = reports.map((r) => ({
    id: r.id as string,
    createdAt: r.created_at as string,
    imageUrl: r.image_url as string | null,
    // 클리닉 분반 리포트는 "리포트(클리닉)"으로 구분 표기
    isClinic: ((r.class as { name?: string } | null)?.name ?? '').includes('클리닉'),
  }))

  const EXAM_TYPE_LABELS: Record<string, string> = { mock: '모의고사', midterm: '중간고사', final: '기말고사', other: '기타' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const examItems = ((examResultsResult.data ?? []) as any[])
    .filter((r) => r.score !== null)
    .map((r) => ({
      id: r.id as string,
      examName: r.exam_name as string,
      examType: (EXAM_TYPE_LABELS[r.exam_type] ?? r.exam_type) as string,
      examDate: r.exam_date as string,
      score: r.score as number,
      maxScore: r.max_score as number,
      grade: gradeFromScore(r.score as number, (r.grade_cuts ?? {}) as Record<string, number>),
      rankInExam: r.rank_in_exam as number | null,
      totalInExam: r.total_in_exam as number | null,
      studySuggestion: (r.study_suggestion ?? null) as string | null,
    }))

  // 성적 히스토리 차트용 — 특별시험도 정기 테스트와 함께 추이로 표시
  const examChartData = examItems
    .map((e) => ({ date: e.examDate, score: e.score, maxScore: e.maxScore, label: e.examName }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-950">리포트</h1>

      {/* 성적 히스토리 차트 — 정기 테스트 + 특별시험 함께 표시 */}
      <Card>
        <CardHeader title="성적 히스토리" />
        <div className="px-6 pb-6">
          {scoreData.length > 0 || examChartData.length > 0 ? (
            <ScoreChart tests={scoreData} exams={examChartData} />
          ) : (
            <EmptyState message="등록된 점수가 없습니다." />
          )}
        </div>
      </Card>

      {/* 특별 시험 결과 — 탭하면 선생님 분석·학습 제안 펼침 */}
      {examItems.length > 0 && (
        <Card>
          <CardHeader title="특별 시험 결과" />
          <div className="px-5 pb-5">
            <ExamResultsList items={examItems} />
          </div>
        </Card>
      )}

      {/* 학습 리포트 목록 */}
      <Card>
        <CardHeader title="학습 리포트" />
        <div className="px-6 pb-6">
          {reportItems.length > 0 ? (
            <ReportList reports={reportItems} />
          ) : (
            <EmptyState message="발송된 리포트가 없습니다." />
          )}
        </div>
      </Card>
    </div>
  )
}

