'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'

export type ProgressEntry = {
  studentId: string
  completionPct: number | null
  submitDate?: string
}

export async function createAssignment(data: {
  classId: string
  title: string
  category: string
  issueDate: string
  dueDate: string
  weekNum: number | null
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('createAssignment', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const adminSupabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminSupabase as any).from('assignments').insert({
      class_id:   data.classId,
      title:      data.title,
      category:   data.category  || null,
      issue_date: data.issueDate || null,
      due_date:   data.dueDate   || null,
      week_num:   data.weekNum   ?? null,
    })
    if (error) throw error

    revalidatePath('/admin/assignments')
    return { success: true }
  })
}

export async function updateAssignment(
  id: string,
  data: { title: string; category: string; issueDate: string; dueDate: string; weekNum: number | null },
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('updateAssignment', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const adminSupabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminSupabase as any)
      .from('assignments')
      .update({
        title:      data.title,
        category:   data.category  || null,
        issue_date: data.issueDate || null,
        due_date:   data.dueDate   || null,
        week_num:   data.weekNum   ?? null,
      })
      .eq('id', id)
    if (error) throw error

    revalidatePath('/admin/assignments')
    return { success: true }
  })
}

export async function deleteAssignment(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('deleteAssignment', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase.from('assignments').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/admin/assignments')
    return { success: true }
  })
}

export async function saveProgress(
  assignmentId: string,
  dueDate: string | null,
  entries: ProgressEntry[],
): Promise<ActionResult<{ savedCount: number }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('saveProgress', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }
    if (!entries.length) return { success: false, error: '저장할 데이터가 없습니다.' }

    const today = new Date().toISOString().split('T')[0]
    const rows = entries.map((e) => ({
      assignment_id:  assignmentId,
      student_id:     e.studentId,
      completion_pct: e.completionPct,
      is_overdue:     dueDate ? dueDate < today && (e.completionPct === null || e.completionPct < 100) : false,
      ...(e.submitDate ? { submit_date: e.submitDate } : {}),
    }))

    const adminSupabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error, count } = await (adminSupabase as any)
      .from('assignment_progress')
      .upsert(rows, { onConflict: 'assignment_id,student_id', count: 'exact' })
    if (error) throw error

    revalidatePath('/admin/assignments')
    return { success: true, data: { savedCount: count ?? rows.length } }
  })
}

export async function createCategory(name: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('createCategory', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const { error } = await supabase.from('assignment_categories').insert({ name })
    if (error) throw error

    revalidatePath('/admin/assignments')
    return { success: true }
  })
}
