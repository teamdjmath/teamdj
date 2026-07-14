import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { getVisibleClassOptions } from '@/lib/data/class-options'
import Link from 'next/link'
import { ReportFormClient } from './_components/report-form-client'
import { fromJson } from '@/types/db'
import type { ReportContent, TestScoreJoin } from '@/types/db'

export default async function NewReportPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; sessionDate?: string }>
}) {
  const { classId: selectedClassId, sessionDate: selectedSessionDate } =
    await searchParams

  const user = await getVerifiedUser()
  if (!user) return null

  const admin = createAdminClient()

  const classOptions = (await getVisibleClassOptions()).map((c) => ({ id: c.id, name: c.name }))
  const className    = classOptions.find((c) => c.id === selectedClassId)?.name ?? ''

  type StudentData = {
    id: string
    name: string
    school: string
    grade: string
    attendance: 'present' | 'late' | 'absent' | 'absent_video' | null
    absenceReason: string
    scores: Record<string, {
      score: number | null
      absent?: boolean
      title: string
      examType: string
      date: string
      maxScore?: number
      totalQ?: number
      objQ?: number
      subjQ?: number
      difficulty?: string
      classAverage?: number
    }>
    assignments: Array<{ title: string; completionPct: number | null; issueDate?: string; submitDate?: string; weekNum?: number; beforeEnrollment?: boolean }>
    avgAssignmentPct: number
    initialNotes?: string
  }

  let students: StudentData[] = []
  let testOptions: Array<{ id: string; title: string; date: string }> = []

  if (selectedClassId && selectedSessionDate) {
    // Step 1: 학생 목록 확보 (studentIds 필요)
    const { data: members } = await admin
      .from('class_members')
      .select('student_id, users!student_id(name, school, grade)')
      .eq('class_id', selectedClassId)
      .eq('is_active', true)

    const memberList = (members ?? [])
      .map((m) => {
        const u = m.users as { name: string; school: string; grade: string } | null
        return {
          id:     m.student_id,
          name:   u?.name   ?? '',
          school: u?.school ?? '',
          grade:  u?.grade  ?? '',
        }
      })
      .filter((s) => s.name && s.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

    const studentIds = memberList.map((m) => m.id)

    // Step 2: 독립적인 4개 쿼리를 병렬 실행
    const [
      { data: tests },
      { data: assignments },
      { data: attRows },
      { data: existingReports },
    ] = await Promise.all([
      admin
        .from('tests')
        .select('id, title, test_date')
        .eq('class_id', selectedClassId)
        .order('test_date', { ascending: false })
        .limit(10),
      admin
        .from('assignments')
        .select('id, title, issue_date, due_date, created_at, week_num')
        .eq('class_id', selectedClassId)
        .order('week_num', { ascending: true })
        .limit(10) as unknown as Promise<{ data: Array<{ id: string; title: string; issue_date: string | null; due_date: string | null; created_at: string; week_num: number | null }> | null }>,
      // attRows: studentIds 의존이지만 빈 배열이면 limit(0)으로 안전하게 처리
      studentIds.length > 0
        ? admin
            .from('attendance_logs')
            .select('student_id, status, absence_reason')
            .eq('class_id', selectedClassId)
            .eq('session_date', selectedSessionDate)
            .in('student_id', studentIds)
        : admin
            .from('attendance_logs')
            .select('student_id, status, absence_reason')
            .limit(0),
      admin
        .from('reports')
        .select('student_id, content_json')
        .eq('class_id', selectedClassId)
        .eq('report_date', selectedSessionDate),
    ])

    testOptions = (tests ?? []).map((t) => ({ id: t.id, title: t.title, date: t.test_date }))

    // Step 3: allScores — testIds 필요로 순차 처리
    const scoreMap: Record<string, StudentData['scores']> = {}
    if (studentIds.length > 0 && testOptions.length > 0) {
      const testIds = testOptions.map((t) => t.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allScores } = await (admin as any)
        .from('test_scores')
        .select('student_id, test_id, score, is_absent, tests!test_id(title, exam_type, max_score, total_q, obj_q, subj_q, difficulty, test_date)')
        .in('test_id', testIds)

      type ScoreRow = { student_id: string | null; test_id: string | null; score: number | null; is_absent: boolean | null; tests: unknown }
      const scoreRows = (allScores ?? []) as ScoreRow[]

      // 미응시(score null) 행은 분반 평균에서 제외
      const testStats: Record<string, { sum: number; count: number }> = {}
      for (const s of scoreRows) {
        const tid = s.test_id ?? ''
        if (!tid || s.score === null) continue
        if (!testStats[tid]) testStats[tid] = { sum: 0, count: 0 }
        testStats[tid].sum += s.score ?? 0
        testStats[tid].count++
      }

      for (const row of scoreRows) {
        const sid = row.student_id ?? ''
        const tid = row.test_id ?? ''
        if (!sid || !tid) continue
        // 미응시는 absent 플래그로 전달, 그 외 score null(미입력)은 제외
        if (row.score === null && !row.is_absent) continue
        const t = fromJson<TestScoreJoin>(row.tests)
        if (!scoreMap[sid]) scoreMap[sid] = {}
        scoreMap[sid][tid] = {
          score:        row.score,
          absent:       row.is_absent ?? false,
          title:        t.title,
          examType:     t.exam_type,
          date:         t.test_date,
          maxScore:     t.max_score  ?? undefined,
          totalQ:       t.total_q    ?? undefined,
          objQ:         t.obj_q      ?? undefined,
          subjQ:        t.subj_q     ?? undefined,
          difficulty:   t.difficulty ?? undefined,
          classAverage: testStats[tid]?.count
            ? Math.round(testStats[tid].sum / testStats[tid].count)
            : 0,
        }
      }
    }

    // Step 4: progress — aIds 필요로 순차 처리
    const studentAssignments: Record<string, StudentData['assignments']> = {}
    const assignmentPctMap: Record<string, number> = {}
    if (studentIds.length > 0 && assignments && assignments.length > 0) {
      const aIds = assignments.map((a) => a.id)
      // before_enrollment은 생성 타입에 아직 없는 컬럼(067 추가)이라 캐스팅으로 접근.
      // 마이그레이션 미적용 환경에서도 리포트 생성 자체가 막히지 않도록 실패 시 폴백 조회.
      type ProgressRow = { student_id: string; assignment_id: string; completion_pct: number | null; submit_date: string | null; before_enrollment?: boolean | null }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let { data: progress, error: progressError } = (await (admin as any)
        .from('assignment_progress')
        .select('student_id, assignment_id, completion_pct, submit_date, before_enrollment')
        .in('assignment_id', aIds)
        .in('student_id', studentIds)) as unknown as { data: ProgressRow[] | null; error: { code?: string } | null }

      if (progressError?.code === 'PGRST204' || progressError?.code === '42703') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;({ data: progress } = (await (admin as any)
          .from('assignment_progress')
          .select('student_id, assignment_id, completion_pct, submit_date')
          .in('assignment_id', aIds)
          .in('student_id', studentIds)) as unknown as { data: ProgressRow[] | null })
      }

      for (const row of progress ?? []) {
        const sid = row.student_id
        const aid = row.assignment_id
        const asgn = assignments.find((a) => a.id === aid)
        if (!studentAssignments[sid]) studentAssignments[sid] = []
        studentAssignments[sid].push({
          title:            asgn?.title ?? '',
          completionPct:    row.completion_pct,  // null = 미지참 (카드에서 '미지참'으로 표시)
          issueDate:        asgn?.issue_date ?? asgn?.created_at?.slice(0, 10) ?? undefined,
          submitDate:       row.submit_date ?? asgn?.due_date ?? undefined,
          weekNum:          asgn?.week_num ?? undefined,
          beforeEnrollment: row.before_enrollment ?? false,
        })
      }
      for (const sid of studentIds) {
        const items = studentAssignments[sid] ?? []
        // weekNum 기준 오름차순 정렬 — 강별 순서가 정확히 매핑되도록
        items.sort((a, b) => (a.weekNum ?? 999) - (b.weekNum ?? 999))
        // 평균에서 첫 등원 이전 항목은 애초에 대상이 아니므로 제외, 미지참(null)은 0으로 계산
        const gradable = items.filter((i) => !i.beforeEnrollment)
        if (gradable.length > 0) {
          assignmentPctMap[sid] = Math.round(gradable.reduce((a, b) => a + (b.completionPct ?? 0), 0) / gradable.length)
        }
      }
    }

    // 출석 맵 (병렬로 이미 받은 attRows 처리)
    const attendanceMap: Record<string, { status: 'present' | 'late' | 'absent' | 'absent_video'; reason: string }> = {}
    for (const row of attRows ?? []) {
      attendanceMap[row.student_id] = {
        status: row.status as 'present' | 'late' | 'absent' | 'absent_video',
        reason: row.absence_reason ?? '',
      }
    }

    // 기존 리포트 맵 (병렬로 이미 받은 existingReports 처리)
    const existingMap: Record<string, ReportContent> = {}
    for (const r of existingReports ?? []) {
      if (r.student_id) existingMap[r.student_id] = fromJson<ReportContent>(r.content_json)
    }

    const firstReport = existingReports?.[0]?.content_json
      ? fromJson<ReportContent>(existingReports[0].content_json)
      : undefined
    const initialCommon = firstReport
      ? {
          studyContent: firstReport.studyContent,
          homework:     firstReport.homework,
          announcement: firstReport.announcement,
        }
      : null

    students = memberList.map((m) => {
      const att      = attendanceMap[m.id]
      const existing = existingMap[m.id]
      return {
        id:               m.id,
        name:             m.name,
        school:           m.school,
        grade:            m.grade,
        attendance:       (existing?.todayAttendance ?? att?.status) ?? null,
        absenceReason:    att?.reason || existing?.absenceReason || '-',
        scores:           scoreMap[m.id] ?? {},
        assignments:      studentAssignments[m.id] ?? [],
        avgAssignmentPct: assignmentPctMap[m.id] ?? 0,
        // 기존 리포트가 있으면 특이사항을 채워서 수정 모드에서 이어서 편집 가능하게
        initialNotes:     existing?.notes ?? '',
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
        key={`${selectedClassId}-${selectedSessionDate}`}
        classOptions={classOptions}
        testOptions={testOptions}
        students={students}
        selectedClassId={selectedClassId ?? null}
        selectedSessionDate={selectedSessionDate ?? null}
        className={className}
        initialCommon={null}
      />
    </div>
  )
}
