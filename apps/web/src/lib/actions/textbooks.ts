'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Textbook = { id: string; name: string }

export async function getTextbooks(): Promise<{ data?: Textbook[]; error?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from('textbooks').select('id, name').order('name')
  if (error) return { error: '교재 목록 조회에 실패했습니다.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { data: (data ?? []).map((t: any) => ({ id: t.id as string, name: t.name as string })) }
}

export async function createTextbook(name: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('textbooks').insert({ name: name.trim() })

  if (error) {
    if (error.code === '23505') return { error: '이미 등록된 교재명입니다.' }
    return { error: '교재 등록에 실패했습니다.' }
  }

  revalidatePath('/admin/lectures')
  revalidatePath('/dashboard/qna/new')
  return {}
}

export async function deleteTextbook(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from('qna_questions')
    .select('id', { count: 'exact', head: true })
    .eq('textbook_id', id)

  if (count && count > 0) return { error: '사용 중인 교재입니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('textbooks').delete().eq('id', id)

  if (error) return { error: '교재 삭제에 실패했습니다.' }

  revalidatePath('/admin/lectures')
  revalidatePath('/dashboard/qna/new')
  return {}
}
