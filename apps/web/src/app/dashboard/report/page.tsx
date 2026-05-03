import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ScoreChart } from './_components/score-chart'
import { ReportList } from './_components/report-list'

const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split('T')[0]

export default async function ReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user!.id

  const [reportsResult, scoresResult, attendanceResult] = await Promise.all([
    supabase
      .from('reports')
      .select('id, created_at, image_url')
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('test_scores')
      .select('score, max_score, subject, test_date')
      .eq('student_id', userId)
      .order('test_date', { ascending: true })
      .limit(10),
    supabase
      .from('attendance')
      .select('status')
      .eq('student_id', userId)
      .gte('date', THIRTY_DAYS_AGO),
  ])

  const reports = reportsResult.data ?? []
  const scores = scoresResult.data ?? []
  const attendance = attendanceResult.data ?? []

  const attCount = { present: 0, late: 0, absent: 0 }
  for (const row of attendance) {
    const s = row.status as string
    if (s === 'present') attCount.present++
    else if (s === 'late') attCount.late++
    else if (s === 'absent') attCount.absent++
  }
  const attTotal = attCount.present + attCount.late + attCount.absent

  const scoreData = scores.map((s) => ({
    date: s.test_date as string,
    score: s.score as number,
    maxScore: s.max_score as number,
    subject: s.subject as string,
  }))

  const reportItems = reports.map((r) => ({
    id: r.id as string,
    createdAt: r.created_at as string,
    imageUrl: r.image_url as string | null,
  }))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-950">리포트</h1>

      {/* 출석 현황 */}
      <Card>
        <CardHeader title="출석 현황 (최근 30일)" />
        <div className="px-5 pb-5">
          {attTotal > 0 ? (
            <div className="grid grid-cols-3 gap-3 text-center">
              <AttStat label="출석" value={attCount.present} total={attTotal} />
              <AttStat label="지각" value={attCount.late} total={attTotal} />
              <AttStat label="결석" value={attCount.absent} total={attTotal} />
            </div>
          ) : (
            <EmptyState message="출결 데이터가 없습니다." />
          )}
        </div>
      </Card>

      {/* 성적 히스토리 차트 */}
      <Card>
        <CardHeader title="성적 히스토리" />
        <div className="px-5 pb-5">
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
        <div className="px-5 pb-5">
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

function AttStat({
  label,
  value,
  total,
}: {
  label: string
  value: number
  total: number
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="rounded-xl border border-zinc-100 p-3 text-center">
      <p className="text-2xl font-bold text-zinc-950">{value}</p>
      <p className="text-xs font-medium text-zinc-500 mt-0.5">{label}</p>
      <p className="text-[10px] text-zinc-300 mt-1">{pct}%</p>
    </div>
  )
}
