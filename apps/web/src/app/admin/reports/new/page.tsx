import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ReportFormClient } from './_components/report-form-client'
import type { ReportContent } from '@/lib/actions/reports'

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
    school: string
    grade: string
    attendance: 'present' | 'late' | 'absent' | null
    absenceReason: string
    // 모든 테스트 점수 저장 (클라이언트에서 선택 가능하도록)
    scores: Record<string, {
      score: number
      title: string
      examType: string
      date: string
      totalQ?: number
      objQ?: number
      subjQ?: number
      difficulty?: string
      classAverage?: number
    }>
    // 모든 과제 정보
    assignments: Array<{ title: string; completionPct: number }>
    avgAssignmentPct: number
  }

  let students: StudentData[] = []
  let testOptions: Array<{ id: string; title: string; date: string }> = []

  if (selectedClassId && selectedSessionDate) {
    const { data: members } = await admin
      .from('class_members')
      .select('student_id, users!student_id(name, school, grade)')
      .eq('class_id', selectedClassId)
      .eq('is_active', true)

    const memberList = (members ?? [])
      .map((m) => {
        const u = m.users as unknown as { name: string; school: string; grade: string } | null
        return {
          id:     m.student_id as string,
          name:   u?.name   ?? '',
          school: u?.school ?? '',
          grade:  u?.grade  ?? '',
        }
      })
      .filter((s) => s.name && s.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

    const studentIds = memberList.map((m) => m.id)

    // 1. 테스트 목록 및 점수
    const scoreMap: Record<string, StudentData['scores']> = {}
    if (studentIds.length > 0) {
      const { data: tests } = await admin
        .from('tests')
        .select('id, title, test_date')
        .eq('class_id', selectedClassId)
        .order('test_date', { ascending: false })
        .limit(10)
      
      testOptions = (tests ?? []).map(t => ({ id: t.id, title: t.title, date: t.test_date }))

      if (testOptions.length > 0) {
        const testIds = testOptions.map(t => t.id)
        
        const { data: allScores } = await admin
          .from('test_scores')
          .select('student_id, test_id, score, tests!test_id(title, exam_type, total_q, obj_q, subj_q, difficulty, test_date)')
          .in('test_id', testIds)

        const testStats: Record<string, { sum: number, count: number }> = {}
        for (const s of allScores ?? []) {
          const tid = s.test_id as string
          if (!testStats[tid]) testStats[tid] = { sum: 0, count: 0 }
          testStats[tid].sum += (s.score as number)
          testStats[tid].count++
        }

        for (const row of allScores ?? []) {
          const sid = row.student_id as string
          const tid = row.test_id as string
          const t = row.tests as unknown as { title: string; exam_type: string; total_q: number; obj_q: number; subj_q: number; difficulty: string; test_date: string }
          if (!scoreMap[sid]) scoreMap[sid] = {}
          
          scoreMap[sid][tid] = {
            score:        row.score as number,
            title:        t.title,
            examType:     t.exam_type,
            date:         t.test_date,
            totalQ:       t.total_q,
            objQ:         t.obj_q,
            subjQ:        t.subj_q,
            difficulty:   t.difficulty,
            classAverage: Math.round(testStats[tid].sum / testStats[tid].count)
          }
        }
      }
    }

    // 2. 과제 목록 및 진행도
    const studentAssignments: Record<string, StudentData['assignments']> = {}
    const assignmentPctMap: Record<string, number> = {}
    if (studentIds.length > 0) {
      const { data: assignments } = await admin
        .from('assignments')
        .select('id, title')
        .eq('class_id', selectedClassId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (assignments && assignments.length > 0) {
        const aIds = assignments.map(a => a.id)
        const { data: progress } = await admin
          .from('assignment_progress')
          .select('student_id, assignment_id, completion_pct')
          .in('assignment_id', aIds)
          .in('student_id', studentIds)

        for (const row of progress ?? []) {
          const sid = row.student_id as string
          const aid = row.assignment_id as string
          const title = assignments.find(a => a.id === aid)?.title ?? ''
          if (!studentAssignments[sid]) studentAssignments[sid] = []
          studentAssignments[sid].push({ title, completionPct: row.completion_pct as number })
        }

        for (const sid of studentIds) {
          const items = studentAssignments[sid] ?? []
          if (items.length > 0) {
            assignmentPctMap[sid] = Math.round(items.reduce((a, b) => a + b.completionPct, 0) / items.length)
          }
        }
      }
    }

    // 3. 출석
    const attendanceMap: Record<string, { status: 'present' | 'late' | 'absent'; reason: string }> = {}
    if (studentIds.length > 0) {
      const { data: attRows } = await admin
        .from('attendance_logs')
        .select('student_id, status, absence_reason')
        .eq('class_id', selectedClassId)
        .eq('session_date', selectedSessionDate)
        .in('student_id', studentIds)

      for (const row of attRows ?? []) {
        attendanceMap[row.student_id as string] = {
          status: row.status as 'present' | 'late' | 'absent',
          reason: row.absence_reason ?? ''
        }
      }
    }

    // 4. 기존 리포트
    const { data: existingReports } = await admin
      .from('reports')
      .select('student_id, content_json')
      .eq('class_id', selectedClassId)
      .eq('report_date', selectedSessionDate)

    const existingMap: Record<string, ReportContent> = {}
    for (const r of existingReports ?? []) {
      if (r.student_id) existingMap[r.student_id] = r.content_json as unknown as ReportContent
    }

    const firstReport = existingReports?.[0]?.content_json as unknown as ReportContent | undefined
    const initialCommon = firstReport ? {
      studyContent: firstReport.studyContent,
      homework: firstReport.homework,
      announcement: firstReport.announcement,
    } : null

    students = memberList.map((m) => {
      const att = attendanceMap[m.id]
      const existing = existingMap[m.id]
      return {
        id:               m.id,
        name:             m.name,
        school:           m.school,
        grade:            m.grade,
        attendance:       (existing?.todayAttendance ?? att?.status) ?? null,
        absenceReason:    att?.reason || (existing?.absenceReason) || '-',
        scores:           scoreMap[m.id] ?? {},
        assignments:      studentAssignments[m.id] ?? [],
        avgAssignmentPct: assignmentPctMap[m.id] ?? 0,
      }
    })

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
          <h1 className="text-xl font-bold text-zinc-950">
            {existingReports?.length ? '리포트 수정' : '리포트 작성'}
          </h1>
        </div>

        <ReportFormClient
          key={`${selectedClassId}-${selectedSessionDate}`}
          classOptions={classOptions}
          testOptions={testOptions}
          students={students}
          selectedClassId={selectedClassId ?? null}
          selectedSessionDate={selectedSessionDate ?? null}
          className={className}
          initialCommon={initialCommon}
        />
      </div>
    )
  }

  return null
}
