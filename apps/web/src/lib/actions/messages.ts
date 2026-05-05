'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendMessage(data: {
  classId: string | null
  studentId: string | null
  content: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증 필요')
  if (!data.content.trim()) throw new Error('내용을 입력하세요')
  if (!data.classId && !data.studentId) throw new Error('발송 대상을 선택하세요')

  const { error } = await supabase
    .from('push_messages')
    .insert({
      sender_id: user.id,
      class_id: data.classId ?? null,
      student_id: data.studentId ?? null,
      content: data.content.trim(),
    })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/messages')
}

export async function markAllAsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증 필요' }

  // 소속 반 ID 목록 가져오기 (반 전체 발송 메시지도 읽음 처리하기 위해)
  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('student_id', user.id)
    .eq('is_active', true)
  
  const classIds = (memberships ?? []).map(m => m.class_id)

  const { error } = await supabase
    .from('push_messages')
    .update({ is_read: true })
    .or(`student_id.eq.${user.id}${classIds.length > 0 ? `,class_id.in.(${classIds.join(',')})` : ''}`)
    .eq('is_read', false)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}
