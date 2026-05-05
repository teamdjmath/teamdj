'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type ActionResult = { success: true } | { success: false; error: string }

export async function createNotice(data: {
  title: string
  content: string
  classId?: string
  isPinned: boolean
}): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }

  const { error } = await adminSupabase.from('notices').insert({
    author_id: user.id,
    title:     data.title,
    content:   data.content,
    class_id:  data.classId || null,
    is_pinned: data.isPinned,
  })

  if (error) return { success: false, error: `공지 등록 실패: ${error.message}` }

  // 학생들에게 알림 발송
  try {
    if (data.classId) {
      // 특정 반 학생들에게 발송
      const { data: members } = await adminSupabase
        .from('class_members')
        .select('student_id')
        .eq('class_id', data.classId)
        .eq('is_active', true)
      
      if (members && members.length > 0) {
        const messages = members.map(m => ({
          sender_id: user.id,
          student_id: m.student_id,
          content: `[공지] ${data.title}`,
        }))
        await adminSupabase.from('push_messages').insert(messages)
      }
    } else {
      // 전체 학생들에게 발송 (student 역할인 모든 유저)
      const { data: students } = await adminSupabase
        .from('users')
        .select('id')
        .eq('role', 'student')
      
      if (students && students.length > 0) {
        const messages = students.map(s => ({
          sender_id: user.id,
          student_id: s.id,
          content: `[전체 공지] ${data.title}`,
        }))
        await adminSupabase.from('push_messages').insert(messages)
      }
    }
  } catch (err) {
    console.error('[createNotice] Failed to send notifications:', err)
    // 공지 등록은 성공했으므로 에러를 반환하지는 않음
  }

  revalidatePath('/admin/notices')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateNotice(
  id: string,
  data: {
    title: string
    content: string
    classId?: string
    isPinned: boolean
  },
): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }

  const { error } = await adminSupabase
    .from('notices')
    .update({
      title:     data.title,
      content:   data.content,
      class_id:  data.classId || null,
      is_pinned: data.isPinned,
    })
    .eq('id', id)

  if (error) return { success: false, error: `공지 수정 실패: ${error.message}` }
  revalidatePath('/admin/notices')
  return { success: true }
}

export async function deleteNotice(id: string): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }

  const { error } = await adminSupabase.from('notices').delete().eq('id', id)
  if (error) return { success: false, error: `공지 삭제 실패: ${error.message}` }
  revalidatePath('/admin/notices')
  return { success: true }
}
