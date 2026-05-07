'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/actions'

export async function sendMessage(data: {
  classId: string | null
  studentId: string | null
  content: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('sendMessage', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }

    if (!data.content.trim()) return { success: false, error: '내용을 입력하세요.' }
    if (!data.classId && !data.studentId) return { success: false, error: '발송 대상을 선택하세요.' }

    const { error } = await supabase.from('push_messages').insert({
      sender_id:  user.id,
      class_id:   data.classId ?? null,
      student_id: data.studentId ?? null,
      content:    data.content.trim(),
    })
    if (error) throw error

    revalidatePath('/admin/messages')
    return { success: true }
  })
}

export async function markAllAsRead(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('markAllAsRead', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const { data: memberships } = await supabase
      .from('class_members')
      .select('class_id')
      .eq('student_id', user.id)
      .eq('is_active', true)

    const classIds = (memberships ?? []).map((m) => m.class_id)

    const { error } = await supabase
      .from('push_messages')
      .update({ is_read: true })
      .or(`student_id.eq.${user.id}${classIds.length > 0 ? `,class_id.in.(${classIds.join(',')})` : ''}`)
      .eq('is_read', false)
    if (error) throw error

    revalidatePath('/dashboard')
    return { success: true }
  })
}
