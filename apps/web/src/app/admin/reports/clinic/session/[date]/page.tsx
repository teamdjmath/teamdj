import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClinicSessionClient } from './_components/clinic-session-client'

export default async function ClinicSessionPage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.user_metadata?.role as string | undefined
  if (!user || !['teacher', 'ta_desk'].includes(role ?? '')) redirect('/admin/dashboard')

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (admin as any)
    .from('reports')
    .select('id, image_url, kakao_sent_at, student_id, student:users!student_id(name, school)')
    .eq('report_type', 'clinic')
    .eq('report_date', date)
    .order('student_id')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reports = ((rows ?? []) as any[])
    .map((r) => {
      const student = r.student as { name?: string; school?: string } | null
      return {
        id:          r.id as string,
        imageUrl:    (r.image_url ?? null) as string | null,
        kakaoSentAt: (r.kakao_sent_at ?? null) as string | null,
        studentName: student?.name ?? '',
        school:      student?.school ?? '',
      }
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName, 'ko'))

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
        <h1 className="text-xl font-bold text-zinc-950">클리닉 리포트 · {date}</h1>
        <p className="mt-0.5 text-sm text-zinc-400">{reports.length}명</p>
      </div>

      <ClinicSessionClient date={date} reports={reports} />
    </div>
  )
}
