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
