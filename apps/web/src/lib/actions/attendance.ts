'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type AttendanceStatus = 'present' | 'absent' | 'late'

export type AttendanceEntry = {
  studentId:      string
  status:         AttendanceStatus
  absenceReason?: string
}

export type SaveResult = { error?: string; savedCount?: number }

// ── 출결 일괄 저장 (upsert)
export async function saveAttendance(
  classId: string,
  sessionDate: string, // YYYY-MM-DD
  entries: AttendanceEntry[],
): Promise<SaveResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { error: '권한이 없습니다.' }

  if (!entries.length) return { error: '저장할 출결 데이터가 없습니다.' }

  const rows = entries.map((e) => ({
    class_id:       classId,
    student_id:     e.studentId,
    session_date:   sessionDate,
    status:         e.status,
    absence_reason: e.absenceReason ?? null,
  }))

  const { error, count } = await supabase
    .from('attendance_logs')
    .upsert(rows, {
      onConflict: 'class_id,student_id,session_date',
      count: 'exact',
    })

  if (error) return { error: '저장에 실패했습니다.' }

  revalidatePath('/admin/attendance')
  return { savedCount: count ?? rows.length }
}
