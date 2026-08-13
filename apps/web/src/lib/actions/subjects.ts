'use server'

import { createClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { revalidatePath } from 'next/cache'

export type Subject = { id: string; name: string }

export async function getSubjects(): Promise<{ data?: Subject[]; error?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from('subjects').select('id, name').order('name')
  if (error) return { error: '과목 목록 조회에 실패했습니다.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { data: (data ?? []).map((s: any) => ({ id: s.id as string, name: s.name as string })) }
}

export async function createSubject(name: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getVerifiedUser()
  if (!user) return { error: '인증이 필요합니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('subjects').insert({ name: name.trim() })

  if (error) {
    if (error.code === '23505') return { error: '이미 등록된 과목명입니다.' }
    return { error: '과목 등록에 실패했습니다.' }
  }

  revalidatePath('/admin/lectures')
  revalidatePath('/dashboard/qna/new')
  return {}
}

export async function deleteSubject(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getVerifiedUser()
  if (!user) return { error: '인증이 필요합니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from('qna_questions')
    .select('id', { count: 'exact', head: true })
    .eq('subject_id', id)

  if (count && count > 0) return { error: '사용 중인 과목입니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('subjects').delete().eq('id', id)

  if (error) return { error: '과목 삭제에 실패했습니다.' }

  revalidatePath('/admin/lectures')
  revalidatePath('/dashboard/qna/new')
  return {}
}
