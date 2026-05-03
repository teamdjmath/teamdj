import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ReportFormClient } from './_components/report-form-client'
import type { ReportContent } from '@/lib/actions/reports'

export default async function NewReportPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; studentId?: string }>
}) {
  const { classId: selectedClassId, studentId: selectedStudentId } = await searchParams
  const supabase = await createClient()

  const { data: classes } = await supabase
    .from('class_groups')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // 분반 선택 시 해당 학생 목록
  let students: Array<{ id: string; name: string }> = []
  if (selectedClassId) {
    const { data: members } = await supabase
      .from('class_members')
      .select('student_id, users!student_id(name)')
      .eq('class_id', selectedClassId)
      .eq('is_active', true)

    students = (members ?? [])
      .map((m) => ({
        id: m.student_id as string,
        name: ((m.users as unknown as { name: string } | null)?.name ?? '') as string,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }

  // 학생 + 분반 선택 시 데이터 자동 수집
  let autoData: Pick<ReportContent, 'recentScores' | 'attendanceSummary' | 'avgAssignmentPct'> | null = null
  let studentName = ''
  let className = ''

  if (selectedClassId && selectedStudentId) {
    // 학생 이름
    const found = students.find((s) => s.id === selectedStudentId)
    studentName = found?.name ?? ''

    // 분반 이름
    const foundClass = (classes ?? []).find((c) => c.id === selectedClassId)
    className = foundClass?.name ?? ''

    // 최근 테스트 점수 (최근 5개)
    const { data: scoreRows } = await supabase
      .from('test_scores')
      .select('score, total_q, difficulty, test_date')
      .eq('student_id', selectedStudentId)
      .eq('class_id', selectedClassId)
      .order('test_date', { ascending: false })
      .limit(5)

    const recentScores = (scoreRows ?? []).map((s) => ({
      date: s.test_date as string,
      score: s.score as number,
      total_q: (s.total_q ?? null) as number | null,
      difficulty: (s.difficulty ?? null) as string | null,
    }))

    // 출석 현황 (최근 30일)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const since = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: attRows } = await supabase
      .from('attendance_logs')
      .select('status')
      .eq('student_id', selectedStudentId)
      .eq('class_id', selectedClassId)
      .gte('session_date', since)

    const attArr = (attRows ?? []).map((a) => a.status as string)
    const attendanceSummary = {
      present: attArr.filter((s) => s === 'present').length,
      late: attArr.filter((s) => s === 'late').length,
      absent: attArr.filter((s) => s === 'absent').length,
      total: attArr.length,
    }

    // 과제 평균 완료율
    const { data: progressRows } = await supabase
      .from('assignment_progress')
      .select('completion_pct, assignments!assignment_id(class_id)')
      .eq('student_id', selectedStudentId)

    const classProgress = (progressRows ?? []).filter((p) => {
      const a = p.assignments as { class_id?: string } | null
      return a?.class_id === selectedClassId
    })

    const avgAssignmentPct =
      classProgress.length > 0
        ? Math.round(classProgress.reduce((sum, p) => sum + ((p.completion_pct as number) ?? 0), 0) / classProgress.length)
        : 0

    autoData = { recentScores, attendanceSummary, avgAssignmentPct }
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
        classOptions={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
        students={students}
        selectedClassId={selectedClassId ?? null}
        selectedStudentId={selectedStudentId ?? null}
        studentName={studentName}
        className={className}
        autoData={autoData}
      />
    </div>
  )
}
