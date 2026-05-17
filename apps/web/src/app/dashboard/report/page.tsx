import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ScoreChart } from './_components/score-chart'
import { ReportList } from './_components/report-list'

export default async function ReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
      .select('id, created_at, image_url')
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
      .select('id, exam_name, exam_type, exam_date, score, max_score, grade_cuts, rank_in_exam, total_in_exam, auto_rank')
      .eq('student_id', userId)
      .order('exam_date', { ascending: false })
      .limit(20),
  ])

  const reports = reportsResult.data ?? []
  const scores = scoresResult.data ?? []

  const scoreData = scores.map((s) => {
    const t = s.tests as { test_date: string; max_score: number; title: string } | null
    return {
      date:     t?.test_date ?? '',
      score:    s.score ?? 0,
      maxScore: t?.max_score ?? 100,
      subject:  t?.title ?? '',
    }
  })

  const reportItems = reports.map((r) => ({
    id: r.id as string,
    createdAt: r.created_at as string,
    imageUrl: r.image_url as string | null,
  }))

  const EXAM_TYPE_LABELS: Record<string, string> = { mock: '모의고사', midterm: '중간고사', final: '기말고사', other: '기타' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const examItems = ((examResultsResult.data ?? []) as any[]).map((r) => ({
    id: r.id as string,
    examName: r.exam_name as string,
    examType: (EXAM_TYPE_LABELS[r.exam_type] ?? r.exam_type) as string,
    examDate: r.exam_date as string,
    score: r.score as number,
    maxScore: r.max_score as number,
    gradeCuts: (r.grade_cuts ?? {}) as Record<string, number>,
    rankInExam: r.rank_in_exam as number | null,
    totalInExam: r.total_in_exam as number | null,
  }))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-950">리포트</h1>

      {/* 성적 히스토리 차트 */}
      <Card>
        <CardHeader title="성적 히스토리" />
        <div className="px-6 pb-6">
          {scoreData.length > 0 ? (
            <ScoreChart scores={scoreData} />
          ) : (
            <EmptyState message="등록된 점수가 없습니다." />
          )}
        </div>
      </Card>

      {/* 특별 시험 결과 */}
      {examItems.length > 0 && (
        <Card>
          <CardHeader title="특별 시험 결과" />
          <div className="px-5 pb-5">
            <ul className="divide-y divide-zinc-100">
              {examItems.map((e) => {
                // 등급 계산
                let grade: string | null = null
                if (Object.keys(e.gradeCuts).length > 0) {
                  for (let g = 1; g <= 9; g++) {
                    const cut = e.gradeCuts[String(g)]
                    if (cut !== undefined && e.score >= cut) { grade = `${g}등급`; break }
                  }
                  if (!grade) grade = '9등급'
                }
                return (
                  <li key={e.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{e.examName}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{e.examType} · {e.examDate}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-zinc-900">{e.score} / {e.maxScore}점</p>
                        <div className="flex gap-1.5 justify-end mt-0.5">
                          {grade && (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">{grade}</span>
                          )}
                          {e.rankInExam != null && (
                            <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] text-white">
                              {e.rankInExam}/{e.totalInExam ?? '?'}등
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
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

