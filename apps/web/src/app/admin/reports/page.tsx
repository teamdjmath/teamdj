import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { ReportsClient } from './_components/reports-client'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; date?: string }>
}) {
  const { classId: selectedClassId, date: selectedDate } = await searchParams
  const admin = createAdminClient()

  const { data: classes } = await admin
    .from('class_groups')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  let query = admin
    .from('reports')
    .select('id, report_date, class_id, image_url, kakao_sent_at, class:class_groups!class_id(name)')
    .order('report_date', { ascending: false })
    .order('class_id')

  if (selectedClassId) query = query.eq('class_id', selectedClassId) as typeof query
  if (selectedDate)    query = query.eq('report_date', selectedDate)  as typeof query

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
    const r         = row as Record<string, unknown>
    const classId   = r.class_id as string
    const date      = r.report_date as string
    const className = ((r.class as { name?: string } | null)?.name ?? '') as string
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
        <Link
          href="/admin/reports/new"
          className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          리포트 작성
        </Link>
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
