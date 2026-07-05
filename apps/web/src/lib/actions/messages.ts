'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'
import { createNotification } from '@/lib/actions/notifications'
import { logger } from '@/lib/logger'
import { logAudit } from '@/lib/audit'

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
    if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    if (!data.content.trim()) return { success: false, error: '내용을 입력하세요.' }
    if (!data.classId && !data.studentId) return { success: false, error: '발송 대상을 선택하세요.' }

    const { error } = await supabase.from('push_messages').insert({
      sender_id:  user.id,
      class_id:   data.classId ?? null,
      student_id: data.studentId ?? null,
      content:    data.content.trim(),
    })
    if (error) throw error

    // 알림 생성 (실패해도 메인 동작에 영향 없음)
    try {
      const preview = data.content.trim().slice(0, 30) + (data.content.trim().length > 30 ? '...' : '')
      const admin = createAdminClient()

      if (data.studentId) {
        await createNotification(
          data.studentId,
          'message_new',
          '새 쪽지가 도착했습니다',
          preview,
          '/dashboard',
        )
      } else if (data.classId) {
        const { data: members } = await admin
          .from('class_members')
          .select('student_id')
          .eq('class_id', data.classId)
          .eq('is_active', true)

        if (members && members.length > 0) {
          await Promise.all(
            members.map((m) =>
              createNotification(
                m.student_id as string,
                'message_new',
                '새 쪽지가 도착했습니다',
                preview,
                '/dashboard',
              ),
            ),
          )
        }
      }
    } catch (err) {
      logger.warn('sendMessage:notification-failed', { action: 'sendMessage', userId: user.id, error: err })
    }

    await logAudit(user, {
      action: 'message.send', targetType: 'message',
      targetId: data.studentId ?? data.classId ?? '',
      targetLabel: data.studentId ? '학생 개별 쪽지' : '분반 전체 쪽지',
      detail: { classId: data.classId, studentId: data.studentId },
    })

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
