import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ReportsClient } from './_components/reports-client'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>
}) {
  const { classId: selectedClassId } = await searchParams
  const supabase = await createClient()

  const { data: classes } = await supabase
    .from('class_groups')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  let query = supabase
    .from('reports')
    .select(
      'id, report_date, image_url, kakao_sent_at, created_at, student:users!student_id(name), class:class_groups!class_id(name)',
    )
    .order('report_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (selectedClassId) {
    query = query.eq('class_id', selectedClassId) as typeof query
  }

  const { data: rows } = await query

  const reports = (rows ?? []).map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: row.id as string,
      report_date: row.report_date as string,
      image_url: (row.image_url ?? null) as string | null,
      kakao_sent_at: (row.kakao_sent_at ?? null) as string | null,
      created_at: row.created_at as string,
      studentName: ((row.student as { name?: string } | null)?.name ?? '') as string,
      className: ((row.class as { name?: string } | null)?.name ?? '') as string,
    }
  })

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
        classOptions={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
        selectedClassId={selectedClassId ?? null}
        reports={reports}
      />
    </div>
  )
}
