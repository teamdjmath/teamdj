import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ReportFormClient } from './_components/report-form-client'

export default async function NewReportPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; sessionDate?: string }>
}) {
  const { classId: selectedClassId, sessionDate: selectedSessionDate } =
    await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const { data: classes } = await admin
    .from('class_groups')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  const classOptions = (classes ?? []).map((c) => ({ id: c.id as string, name: c.name as string }))
  const className    = classOptions.find((c) => c.id === selectedClassId)?.name ?? ''

  type StudentData = {
    id: string
    name: string
    attendance: 'present' | 'late' | 'absent' | null
    recentScore: { score: number; title: string; examType: string; date: string } | null
    avgAssignmentPct: number
  }

  let students: StudentData[] = []

  if (selectedClassId && selectedSessionDate) {
    const { data: members } = await admin
      .from('class_members')
      .select('student_id, users!student_id(name)')
      .eq('class_id', selectedClassId)
      .eq('is_active', true)

    const memberList = (members ?? [])
      .map((m) => ({
        id:   m.student_id as string,
        name: ((m.users as unknown as { name: string } | null)?.name ?? '') as string,
      }))
      .filter((s) => s.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

    const studentIds = memberList.map((m) => m.id)

    // 당일 출석 현황 (attendance_logs)
    const attendanceMap: Record<string, 'present' | 'late' | 'absent'> = {}
    if (studentIds.length > 0) {
      const { data: attRows } = await admin
        .from('attendance_logs')
        .select('student_id, status')
        .eq('class_id', selectedClassId)
        .eq('session_date', selectedSessionDate)
        .in('student_id', studentIds)

      for (const row of attRows ?? []) {
        const sid    = row.student_id as string
        const status = row.status    as string
        if (status === 'present' || status === 'late' || status === 'absent') {
          attendanceMap[sid] = status
        }
      }
    }

    // 최근 테스트 점수 (student별 가장 최신 1건)
    const scoreMap: Record<string, { score: number; title: string; examType: string; date: string }> = {}
    if (studentIds.length > 0) {
      const { data: scoreRows } = await admin
        .from('test_scores')
        .select('student_id, score, test_date, tests!test_id(title, exam_type)')
        .eq('class_id', selectedClassId)
        .in('student_id', studentIds)
        .order('test_date', { ascending: false })

      for (const row of scoreRows ?? []) {
        const sid = row.student_id as string
        if (scoreMap[sid]) continue
        const t = row.tests as unknown as { title: string; exam_type: string } | null
        scoreMap[sid] = {
          score:    row.score    as number,
          title:    t?.title    ?? '',
          examType: t?.exam_type ?? '',
          date:     row.test_date as string,
        }
      }
    }

    // 평균 과제 완료율
    const assignmentPctMap: Record<string, number> = {}
    if (studentIds.length > 0) {
      const { data: assignments } = await admin
        .from('assignments')
        .select('id')
        .eq('class_id', selectedClassId)

      const assignmentIds = (assignments ?? []).map((a) => a.id as string)

      if (assignmentIds.length > 0) {
        const { data: progressRows } = await admin
          .from('assignment_progress')
          .select('student_id, completion_pct')
          .in('student_id', studentIds)
          .in('assignment_id', assignmentIds)

        const studentProgress: Record<string, number[]> = {}
        for (const p of progressRows ?? []) {
          const sid = p.student_id as string
          if (!studentProgress[sid]) studentProgress[sid] = []
          studentProgress[sid].push((p.completion_pct as number) ?? 0)
        }

        for (const [sid, pcts] of Object.entries(studentProgress)) {
          assignmentPctMap[sid] = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
        }
      }
    }

    students = memberList.map((m) => ({
      id:               m.id,
      name:             m.name,
      attendance:       attendanceMap[m.id] ?? null,
      recentScore:      scoreMap[m.id] ?? null,
      avgAssignmentPct: assignmentPctMap[m.id] ?? 0,
    }))
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
        <h1 className="text-xl font-bold text-zinc-950">리포트 작성</h1>
      </div>

      <ReportFormClient
        classOptions={classOptions}
        students={students}
        selectedClassId={selectedClassId ?? null}
        selectedSessionDate={selectedSessionDate ?? null}
        className={className}
      />
    </div>
  )
}
