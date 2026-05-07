import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ScoreChart } from './_components/score-chart'
import { ReportList } from './_components/report-list'

export default async function ReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user!.id

  const [reportsResult, scoresResult] = await Promise.all([
    supabase
      .from('reports')
      .select('id, created_at, image_url')
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('test_scores')
      .select('score, tests!test_id(test_date, max_score, title)')
      .eq('student_id', userId)
      .order('tests(test_date)', { ascending: true })
      .limit(10),
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

