'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type AttendanceStatus = 'present' | 'absent' | 'late'

export type AttendanceEntry = {
  studentId:      string
  status:         AttendanceStatus
  absenceReason?: string
}

export type SaveResult =
  | { success: true;  savedCount: number }
  | { success: false; error: string }

// ── 출결 일괄 저장 (upsert)
export async function saveAttendance(
  classId: string,
  sessionDate: string, // YYYY-MM-DD
  entries: AttendanceEntry[],
): Promise<SaveResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }

  if (!entries.length) return { success: false, error: '저장할 출결 데이터가 없습니다.' }

  const rows = entries.map((e) => ({
    class_id:       classId,
    student_id:     e.studentId,
    session_date:   sessionDate,
    status:         e.status,
    absence_reason: e.absenceReason ?? null,
  }))

  const { error, count } = await adminSupabase
    .from('attendance_logs')
    .upsert(rows, {
      onConflict: 'class_id,student_id,session_date',
      count: 'exact',
    })

  if (error) return { success: false, error: `저장 실패: ${error.message}` }

  revalidatePath('/admin/attendance')
  return { success: true, savedCount: count ?? rows.length }
}
