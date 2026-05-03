import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ReportDetailClient } from './_components/report-detail-client'
import type { ReportContent } from '@/lib/actions/reports'

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: row } = await supabase
    .from('reports')
    .select(
      'id, report_date, image_url, kakao_sent_at, content_json, created_at, student:users!student_id(name), class:class_groups!class_id(name)',
    )
    .eq('id', id)
    .single()

  if (!row) notFound()

  const r = row as Record<string, unknown>

  const report = {
    id: r.id as string,
    report_date: r.report_date as string,
    image_url: (r.image_url ?? null) as string | null,
    kakao_sent_at: (r.kakao_sent_at ?? null) as string | null,
    content_json: (r.content_json ?? {}) as unknown as ReportContent,
    created_at: r.created_at as string,
    studentName: ((r.student as { name?: string } | null)?.name ?? '') as string,
    className: ((r.class as { name?: string } | null)?.name ?? '') as string,
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/reports"
          className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
          리포트 목록
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-zinc-950">학습 리포트</h1>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600">
            {report.studentName} · {report.className}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">{report.report_date}</p>
      </div>

      <ReportDetailClient report={report} />
    </div>
  )
}
