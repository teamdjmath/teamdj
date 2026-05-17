'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'
import { logger } from '@/lib/logger'
import { createNotification } from '@/lib/actions/notifications'

export async function createNotice(data: {
  title: string
  content: string
  classId?: string
  isPinned: boolean
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('createNotice', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_admin'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase.from('notices').insert({
      author_id: user.id,
      title:     data.title,
      content:   data.content,
      class_id:  data.classId || null,
      is_pinned: data.isPinned,
    })
    if (error) throw error

    try {
      if (data.classId) {
        const { data: members } = await adminSupabase
          .from('class_members')
          .select('student_id')
          .eq('class_id', data.classId)
          .eq('is_active', true)

        if (members && members.length > 0) {
          const messages = members.map((m) => ({
            sender_id: user.id, student_id: m.student_id, content: `[공지] ${data.title}`,
          }))
          await adminSupabase.from('push_messages').insert(messages)
          await Promise.all(
            members.map((m) =>
              createNotification(
                m.student_id as string,
                'notice_new',
                '새 공지사항이 등록되었습니다',
                data.title,
                '/dashboard',
              ),
            ),
          )
        }
      } else {
        const { data: students } = await adminSupabase.from('users').select('id').eq('role', 'student')
        if (students && students.length > 0) {
          const messages = students.map((s) => ({
            sender_id: user.id, student_id: s.id, content: `[전체 공지] ${data.title}`,
          }))
          await adminSupabase.from('push_messages').insert(messages)
          await Promise.all(
            students.map((s) =>
              createNotification(
                s.id as string,
                'notice_new',
                '새 공지사항이 등록되었습니다',
                data.title,
                '/dashboard',
              ),
            ),
          )
        }
      }
    } catch (err) {
      logger.warn('createNotice:notification-failed', { action: 'createNotice', userId: user.id, error: err })
    }

    revalidatePath('/admin/notices')
    revalidatePath('/dashboard')
    return { success: true }
  })
}

export async function updateNotice(
  id: string,
  data: { title: string; content: string; classId?: string; isPinned: boolean },
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('updateNotice', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_admin'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
      .from('notices')
      .update({ title: data.title, content: data.content, class_id: data.classId || null, is_pinned: data.isPinned })
      .eq('id', id)
    if (error) throw error

    revalidatePath('/admin/notices')
    return { success: true }
  })
}

export async function deleteNotice(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('deleteNotice', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_admin'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase.from('notices').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/admin/notices')
    return { success: true }
  })
}
