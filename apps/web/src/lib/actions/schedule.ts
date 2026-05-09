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
