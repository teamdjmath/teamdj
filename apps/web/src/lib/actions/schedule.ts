'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from './classes'

export async function createExtraSchedule(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const title          = (formData.get('title') as string).trim()
  const scheduled_date = formData.get('scheduled_date') as string
  const start_time     = formData.get('start_time') as string
  const end_time       = formData.get('end_time') as string
  const note           = (formData.get('note') as string | null)?.trim() || null

  if (!title || !scheduled_date || !start_time || !end_time) {
    return { success: false, error: '필수 항목을 입력해주세요.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('extra_schedules').insert({
    user_id: user.id,
    title,
    scheduled_date,
    start_time,
    end_time,
    note,
  })

  if (error) return { success: false, error: `등록 실패: ${error.message}` }

  revalidatePath('/admin/schedule')
  return { success: true }
}

export async function deleteExtraSchedule(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('extra_schedules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: `삭제 실패: ${error.message}` }

  revalidatePath('/admin/schedule')
  return { success: true }
}
