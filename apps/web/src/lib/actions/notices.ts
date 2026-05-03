'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createNotice(data: {
  title: string
  content: string
  classId?: string
  isPinned: boolean
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { error } = await supabase.from('notices').insert({
    author_id: user.id,
    title: data.title,
    content: data.content,
    class_id: data.classId || null,
    is_pinned: data.isPinned,
  })

  if (error) return { error: '공지 등록에 실패했습니다.' }
  revalidatePath('/admin/notices')
  return {}
}

export async function updateNotice(
  id: string,
  data: {
    title: string
    content: string
    classId?: string
    isPinned: boolean
  },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { error } = await supabase
    .from('notices')
    .update({
      title: data.title,
      content: data.content,
      class_id: data.classId || null,
      is_pinned: data.isPinned,
    })
    .eq('id', id)

  if (error) return { error: '공지 수정에 실패했습니다.' }
  revalidatePath('/admin/notices')
  return {}
}

export async function deleteNotice(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { error } = await supabase.from('notices').delete().eq('id', id)
  if (error) return { error: '삭제에 실패했습니다.' }
  revalidatePath('/admin/notices')
  return {}
}
