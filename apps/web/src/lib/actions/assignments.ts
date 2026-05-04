'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type ActionResult = { success: true } | { success: false; error: string }
export type SaveResult   = { success: true; savedCount: number } | { success: false; error: string }

export type ProgressEntry = {
  studentId: string
  completionPct: number
}

export async function createAssignment(data: {
  classId: string
  title: string
  category: string
  dueDate: string
  weekNum: number | null
}): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }

  const { error } = await adminSupabase.from('assignments').insert({
    class_id: data.classId,
    title:    data.title,
    category: data.category || null,
    due_date: data.dueDate  || null,
    week_num: data.weekNum  ?? null,
  })

  if (error) return { success: false, error: `과제 등록 실패: ${error.message}` }
  revalidatePath('/admin/assignments')
  return { success: true }
}

export async function updateAssignment(
  id: string,
  data: {
    title: string
    category: string
    dueDate: string
    weekNum: number | null
  },
): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }

  const { error } = await adminSupabase
    .from('assignments')
    .update({
      title:    data.title,
      category: data.category || null,
      due_date: data.dueDate  || null,
      week_num: data.weekNum  ?? null,
    })
    .eq('id', id)

  if (error) return { success: false, error: `과제 수정 실패: ${error.message}` }
  revalidatePath('/admin/assignments')
  return { success: true }
}

export async function deleteAssignment(id: string): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }

  const { error } = await adminSupabase.from('assignments').delete().eq('id', id)
  if (error) return { success: false, error: `과제 삭제 실패: ${error.message}` }
  revalidatePath('/admin/assignments')
  return { success: true }
}

export async function saveProgress(
  assignmentId: string,
  dueDate: string | null,
  entries: ProgressEntry[],
): Promise<SaveResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }
  if (!entries.length) return { success: false, error: '저장할 데이터가 없습니다.' }

  const today = new Date().toISOString().split('T')[0]

  const rows = entries.map((e) => ({
    assignment_id:  assignmentId,
    student_id:     e.studentId,
    completion_pct: e.completionPct,
    is_overdue:     dueDate ? dueDate < today && e.completionPct < 100 : false,
  }))

  const { error, count } = await adminSupabase
    .from('assignment_progress')
    .upsert(rows, { onConflict: 'assignment_id,student_id', count: 'exact' })

  if (error) return { success: false, error: `저장 실패: ${error.message}` }
  revalidatePath('/admin/assignments')
  return { success: true, savedCount: count ?? rows.length }
}

export async function createCategory(name: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }

  const { error } = await supabase.from('assignment_categories').insert({ name })
  if (error) return { success: false, error: `카테고리 등록 실패: ${error.message}` }
  
  revalidatePath('/admin/assignments')
  return { success: true }
}
