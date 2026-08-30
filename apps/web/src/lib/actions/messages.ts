'use server'

import { createClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'
import { createNotification } from '@/lib/actions/notifications'
import { logger } from '@/lib/logger'
import { logAudit } from '@/lib/audit'
import { sendKakaoText } from '@/lib/kakao'

export async function sendMessage(data: {
  scope: 'all' | 'class' | 'individual'
  classId: string | null
  studentId: string | null
  content: string
  imageUrls?: string[]
}): Promise<ActionResult> {
  const supabase = await createClient()
  const user = await getVerifiedUser()

  return withAction('sendMessage', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    if (!data.content.trim()) return { success: false, error: '내용을 입력하세요.' }
    if (data.scope === 'class' && !data.classId) return { success: false, error: '분반을 선택하세요.' }
    if (data.scope === 'individual' && !data.studentId) return { success: false, error: '학생을 선택하세요.' }

    const content = data.content.trim()
    const preview = content.slice(0, 30) + (content.length > 30 ? '...' : '')
    const admin = createAdminClient()
    const imageUrls = data.imageUrls ?? []

    if (data.scope === 'individual') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('push_messages').insert({
        sender_id: user.id, student_id: data.studentId, content, image_urls: imageUrls,
      })
      if (error) throw error

      try {
        await createNotification(data.studentId as string, 'message_new', '새 쪽지가 도착했습니다', preview, '/dashboard')
        const { data: student } = await admin.from('users').select('phone').eq('id', data.studentId as string).maybeSingle()
        await sendKakaoText([student?.phone as string | null], `[TeamDJ] 새 쪽지가 도착했습니다.\n${preview}`, 'sendMessage:kakao')
      } catch (err) {
        logger.warn('sendMessage:notification-failed', { action: 'sendMessage', userId: user.id, error: err })
      }
    } else {
      // class: 해당 분반 멤버 / all: 전체 학생 — push_messages는 행마다 student_id가 있어야
      // markAllAsRead 등의 조회 쿼리에 걸리므로 학생별로 한 행씩 넣는다 (createNotice 전체공지와 동일 패턴)
      let targets: { id: string; phone?: string }[]
      if (data.scope === 'class') {
        const { data: members } = await admin
          .from('class_members')
          .select('student_id, student:users!student_id(phone)')
          .eq('class_id', data.classId as string)
          .eq('is_active', true)
        targets = (members ?? []).map((m) => ({ id: m.student_id as string, phone: (m.student as { phone?: string } | null)?.phone }))
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rows } = await (admin as any).from('users').select('id, phone').eq('role', 'student')
        targets = (rows ?? []) as { id: string; phone?: string }[]
      }

      if (targets.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('push_messages').insert(
          targets.map((t) => ({ sender_id: user.id, student_id: t.id, content, image_urls: imageUrls })),
        )
        try {
          await Promise.all(
            targets.map((t) => createNotification(t.id, 'message_new', '새 쪽지가 도착했습니다', preview, '/dashboard')),
          )
          await sendKakaoText(targets.map((t) => t.phone), `[TeamDJ] 새 쪽지가 도착했습니다.\n${preview}`, 'sendMessage:kakao')
        } catch (err) {
          logger.warn('sendMessage:notification-failed', { action: 'sendMessage', userId: user.id, error: err })
        }
      }
    }

    await logAudit(user, {
      action: 'message.send', targetType: 'message',
      targetId: data.studentId ?? data.classId ?? '',
      targetLabel: data.scope === 'individual' ? '학생 개별 쪽지' : data.scope === 'class' ? '분반 전체 쪽지' : '전체 학생 쪽지',
      detail: { scope: data.scope, classId: data.classId, studentId: data.studentId },
    })

    revalidatePath('/admin/messages')
    return { success: true }
  })
}

export async function markAllAsRead(): Promise<ActionResult> {
  const supabase = await createClient()
  const user = await getVerifiedUser()

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
