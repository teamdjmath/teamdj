import { createClient } from '@/lib/supabase/server'
import { getActiveClassOptions } from '@/lib/data/class-options'
import { AttendanceClient } from './_components/attendance-client'

interface PageProps {
  searchParams: Promise<{ classId?: string; date?: string }>
}

export default async function AttendancePage({ searchParams }: PageProps) {
  const { classId, date } = await searchParams
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const selectedDate    = date    ?? today
  const selectedClassId = classId ?? null

  // 분반 목록 / 학생 목록 / 기존 출결 — 모두 URL 파라미터만 의존하므로 병렬 실행
  const [classes, { data: members }, { data: logs }] = await Promise.all([
    getActiveClassOptions(),
    selectedClassId
      ? supabase
          .from('class_members')
          .select('users!student_id(id, name, phone)')
          .eq('class_id', selectedClassId)
          .eq('is_active', true)
          .order('users(name)')
      : Promise.resolve({ data: [] }),
    selectedClassId
      ? supabase
          .from('attendance_logs')
          .select('student_id, status, absence_reason')
          .eq('class_id', selectedClassId)
          .eq('session_date', selectedDate)
      : Promise.resolve({ data: [] }),
  ])

  const classOptions = (classes ?? []).map((c) => ({
    id:    c.id,
    label: `${c.name} (${c.subject} · ${c.grade})`,
  }))

  type MemberUser = { id: string; name: string; phone: string }
  const students = (members ?? [])
    .map((m) => m.users as MemberUser)
    .filter(Boolean)

  const existingLogs: Record<string, { status: string; absenceReason: string | null }> =
    Object.fromEntries(
      (logs ?? []).map((l) => [
        l.student_id,
        { status: l.status, absenceReason: l.absence_reason },
      ]),
    )

  return (
    <AttendanceClient
      classOptions={classOptions}
      selectedClassId={selectedClassId}
      selectedDate={selectedDate}
      students={students}
      existingLogs={existingLogs}
    />
  )
}
