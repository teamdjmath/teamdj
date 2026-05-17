'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'

export type AttendanceStatus = 'present' | 'absent' | 'late'

export type AttendanceEntry = {
  studentId:      string
  status:         AttendanceStatus
  absenceReason?: string
}

export async function saveAttendance(
  classId: string,
  sessionDate: string,
  entries: AttendanceEntry[],
): Promise<ActionResult<{ savedCount: number }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('saveAttendance', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_admin'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }
    if (!entries.length) return { success: false, error: '저장할 출결 데이터가 없습니다.' }

    const rows = entries.map((e) => ({
      class_id:       classId,
      student_id:     e.studentId,
      session_date:   sessionDate,
      status:         e.status,
      absence_reason: e.absenceReason ?? null,
    }))

    const adminSupabase = createAdminClient()
    const { error, count } = await adminSupabase
      .from('attendance_logs')
      .upsert(rows, { onConflict: 'class_id,student_id,session_date', count: 'exact' })
    if (error) throw error

    revalidatePath('/admin/attendance')
    return { success: true, data: { savedCount: count ?? rows.length } }
  })
}
