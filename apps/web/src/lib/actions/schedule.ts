'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'

type ExtraScheduleRow = {
  id: string; title: string; scheduled_date: string
  start_time: string; end_time: string; note: string | null
}

export async function createExtraSchedule(formData: FormData): Promise<ActionResult<ExtraScheduleRow>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('createExtraSchedule', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const title          = (formData.get('title') as string).trim()
    const scheduled_date = formData.get('scheduled_date') as string
    const start_time     = formData.get('start_time') as string
    const end_time       = formData.get('end_time') as string
    const note           = (formData.get('note') as string | null)?.trim() || null

    if (!title || !scheduled_date || !start_time || !end_time) {
      return { success: false, error: '필수 항목을 입력해주세요.' }
    }

    // 유저 세션 클라이언트 사용 — RLS 정책 (auth.uid() = user_id) 통과
    const { data, error } = await supabase
      .from('extra_schedules')
      .insert({ user_id: user.id, title, scheduled_date, start_time, end_time, note })
      .select('id, title, scheduled_date, start_time, end_time, note')
      .single()
    if (error) throw error

    revalidatePath('/admin/schedule')
    return { success: true, data }
  })
}

export async function deleteExtraSchedule(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('deleteExtraSchedule', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const { error } = await supabase
      .from('extra_schedules')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error

    revalidatePath('/admin/schedule')
    return { success: true }
  })
}

// ── 휴강 등록 — 해당 날짜에 진행되지 않은 정규 수업을 기록해 월 근무 시간에서 차감
export type ScheduleAbsenceRow = {
  id: string; class_id: string; absence_date: string; note: string | null
}

export async function createScheduleAbsence(
  classId: string,
  absenceDate: string,
  note?: string,
): Promise<ActionResult<ScheduleAbsenceRow>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('createScheduleAbsence', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }
    if (!classId || !absenceDate) return { success: false, error: '분반과 날짜를 선택해주세요.' }

    // 해당 분반이 실제로 그 요일에 수업이 있는지 검증
    const { data: cls } = await supabase
      .from('class_groups')
      .select('day_of_week')
      .eq('id', classId)
      .maybeSingle()
    if (!cls) return { success: false, error: '분반을 찾을 수 없습니다.' }
    const dow = new Date(absenceDate + 'T00:00:00').getDay()
    if (!cls.day_of_week?.includes(dow)) {
      return { success: false, error: '해당 날짜에는 이 분반 수업이 없습니다.' }
    }

    // 유저 세션 클라이언트 사용 — RLS 정책 (auth.uid() = user_id) 통과
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('schedule_absences')
      .insert({ user_id: user.id, class_id: classId, absence_date: absenceDate, note: note?.trim() || null })
      .select('id, class_id, absence_date, note')
      .single()
    if (error) {
      if (error.code === '23505') return { success: false, error: '이미 등록된 휴강입니다.' }
      throw error
    }

    revalidatePath('/admin/dashboard')
    return { success: true, data: data as ScheduleAbsenceRow }
  })
}

export async function deleteScheduleAbsence(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('deleteScheduleAbsence', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('schedule_absences')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error

    revalidatePath('/admin/dashboard')
    return { success: true }
  })
}
