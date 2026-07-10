import { createAdminClient } from '@/lib/supabase/admin'
import { getVisibleClassOptions } from '@/lib/data/class-options'
import { ReportsClient } from './_components/reports-client'
import { NewReportButton } from './_components/new-report-button'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; date?: string }>
}) {
  const { classId: selectedClassId, date: selectedDate } = await searchParams
  const admin = createAdminClient()

  const classes = await getVisibleClassOptions()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('reports')
    .select('id, report_date, class_id, report_type, image_url, kakao_sent_at, class:class_groups!class_id(name)')
    .order('report_date', { ascending: false })
    .order('class_id')

  if (selectedClassId) query = query.eq('class_id', selectedClassId)
  if (selectedDate)    query = query.eq('report_date', selectedDate)

  const { data: rows } = await query

  // 세션(날짜+분반) 단위로 그룹핑
  const sessionMap = new Map<string, {
    classId: string
    className: string
    date: string
    total: number
    sentCount: number
    sampleImageUrl: string | null
  }>()

  for (const row of rows ?? []) {
    const r        = row as Record<string, unknown>
    const isClinic = r.report_type === 'clinic'
    const classId  = isClinic ? 'clinic' : (r.class_id as string)
    const date     = r.report_date as string
    const className = isClinic
      ? '클리닉'
      : (((r.class as { name?: string } | null)?.name ?? '') as string)
    const key       = `${date}__${classId}`

    if (!sessionMap.has(key)) {
      sessionMap.set(key, { classId, className, date, total: 0, sentCount: 0, sampleImageUrl: null })
    }

    const session = sessionMap.get(key)!
    session.total++
    if (r.kakao_sent_at) session.sentCount++
    if (!session.sampleImageUrl && r.image_url) session.sampleImageUrl = r.image_url as string
  }

  const sessions = Array.from(sessionMap.values())

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-950">학습 리포트</h1>
        <NewReportButton />
      </div>

      <ReportsClient
        classOptions={(classes ?? []).map((c) => ({ id: c.id as string, name: c.name as string }))}
        selectedClassId={selectedClassId ?? null}
        selectedDate={selectedDate ?? null}
        sessions={sessions}
      />
    </div>
  )
}
