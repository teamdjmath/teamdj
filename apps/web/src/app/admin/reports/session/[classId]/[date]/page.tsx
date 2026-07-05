import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SessionClient } from './_components/session-client'

export default async function ReportSessionPage({
  params,
}: {
  params: Promise<{ classId: string; date: string }>
}) {
  const { classId, date } = await params
  const admin = createAdminClient()

  const { data: classRow } = await admin
    .from('class_groups')
    .select('name')
    .eq('id', classId)
    .single()

  if (!classRow) notFound()

  const { data: rows } = await admin
    .from('reports')
    .select('id, image_url, kakao_sent_at, student_id, student:users!student_id(name, school)')
    .eq('class_id', classId)
    .eq('report_date', date)
    .order('student_id')

  const reports = (rows ?? [])
    .map((r) => {
      const row = r as Record<string, unknown>
      const student = (row.student as { name?: string; school?: string } | null)
      return {
        id:           row.id as string,
        imageUrl:     (row.image_url ?? null) as string | null,
        kakaoSentAt:  (row.kakao_sent_at ?? null) as string | null,
        studentName:  student?.name ?? '',
        school:       student?.school ?? '',
      }
    })
    .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
    .sort((a, b) => a.studentName.localeCompare(b.studentName, 'ko'))

  const className = (classRow as { name: string }).name

  const [, mm, dd] = date.split('-')
  const sessionLabel = `${mm}-${dd} (${className})`

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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-950">{sessionLabel} 학습 리포트</h1>
            <p className="mt-1 text-sm text-zinc-500">{date} · {reports.length}명</p>
          </div>
        </div>
      </div>

      <SessionClient
        classId={classId}
        date={date}
        className={className}
        sessionLabel={sessionLabel}
        reports={reports}
      />
    </div>
  )
}
