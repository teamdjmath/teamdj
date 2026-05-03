'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ProgressEntry = {
  studentId: string
  completionPct: number
}

export type SaveResult = { error?: string; savedCount?: number }

export async function createAssignment(data: {
  classId: string
  title: string
  category: string
  dueDate: string
  weekNum: number | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { error } = await supabase.from('assignments').insert({
    class_id: data.classId,
    title: data.title,
    category: data.category || null,
    due_date: data.dueDate || null,
    week_num: data.weekNum ?? null,
  })

  if (error) return { error: '과제 등록에 실패했습니다.' }
  revalidatePath('/admin/assignments')
  return {}
}

export async function updateAssignment(
  id: string,
  data: {
    title: string
    category: string
    dueDate: string
    weekNum: number | null
  },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { error } = await supabase
    .from('assignments')
    .update({
      title: data.title,
      category: data.category || null,
      due_date: data.dueDate || null,
      week_num: data.weekNum ?? null,
    })
    .eq('id', id)

  if (error) return { error: '과제 수정에 실패했습니다.' }
  revalidatePath('/admin/assignments')
  return {}
}

export async function deleteAssignment(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { error } = await supabase.from('assignments').delete().eq('id', id)
  if (error) return { error: '과제 삭제에 실패했습니다.' }
  revalidatePath('/admin/assignments')
  return {}
}

export async function saveProgress(
  assignmentId: string,
  dueDate: string | null,
  entries: ProgressEntry[],
): Promise<SaveResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { error: '권한이 없습니다.' }
  if (!entries.length) return { error: '저장할 데이터가 없습니다.' }

  const today = new Date().toISOString().split('T')[0]

  const rows = entries.map((e) => ({
    assignment_id: assignmentId,
    student_id: e.studentId,
    completion_pct: e.completionPct,
    is_overdue: dueDate ? dueDate < today && e.completionPct < 100 : false,
  }))

  const { error, count } = await supabase
    .from('assignment_progress')
    .upsert(rows, {
      onConflict: 'assignment_id,student_id',
      count: 'exact',
    })

  if (error) return { error: '저장에 실패했습니다.' }

  revalidatePath('/admin/assignments')
  return { savedCount: count ?? rows.length }
}
