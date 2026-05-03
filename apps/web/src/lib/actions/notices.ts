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
  revalidatePath('/admin/notices')
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
