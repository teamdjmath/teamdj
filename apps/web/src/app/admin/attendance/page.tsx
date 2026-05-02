import { createClient } from '@/lib/supabase/server'
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

  // 분반 목록
  const { data: classes } = await supabase
    .from('class_groups')
    .select('id, name, subject, grade')
    .eq('is_active', true)
    .order('name')

  const classOptions = (classes ?? []).map((c) => ({
    id:    c.id,
    label: `${c.name} (${c.subject} · ${c.grade})`,
  }))

  // 선택한 반의 학생 목록
  let students: { id: string; name: string; phone: string }[] = []
  if (selectedClassId) {
    const { data: members } = await supabase
      .from('class_members')
      .select('users!student_id(id, name, phone)')
      .eq('class_id', selectedClassId)
      .eq('is_active', true)
      .order('users(name)')

    type MemberUser = { id: string; name: string; phone: string }
    students = (members ?? [])
      .map((m) => m.users as unknown as MemberUser)
      .filter(Boolean)
  }

  // 해당 날짜의 기존 출결 기록
  let existingLogs: Record<string, { status: string; absenceReason: string | null }> = {}
  if (selectedClassId && students.length > 0) {
    const { data: logs } = await supabase
      .from('attendance_logs')
      .select('student_id, status, absence_reason')
      .eq('class_id', selectedClassId)
      .eq('session_date', selectedDate)

    existingLogs = Object.fromEntries(
      (logs ?? []).map((l) => [
        l.student_id,
        { status: l.status, absenceReason: l.absence_reason },
      ]),
    )
  }

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
