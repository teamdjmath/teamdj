'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type ActionResult = { success: true } | { success: false; error: string }

export type ScoreBulkRow = {
  name: string
  score: number
  total_q?: number
  obj_q?: number
  subj_q?: number
  difficulty?: string
}

export type BulkResult = {
  succeeded: number
  failed: Array<{ name: string; reason: string }>
}

export async function createScore(data: {
  classId: string
  studentId: string
  testDate: string
  score: number
  totalQ?: number
  objQ?: number
  subjQ?: number
  difficulty?: string
}): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }

  const { error } = await adminSupabase.from('test_scores').insert({
    class_id:     data.classId,
    student_id:   data.studentId,
    test_date:    data.testDate,
    score:        data.score,
    total_q:      data.totalQ     ?? null,
    obj_q:        data.objQ       ?? null,
    subj_q:       data.subjQ      ?? null,
    difficulty:   data.difficulty || null,
    input_method: 'manual',
  })

  if (error) return { success: false, error: `점수 등록 실패: ${error.message}` }
  revalidatePath('/admin/scores')
  return { success: true }
}

export async function bulkCreateScores(
  classId: string,
  testDate: string,
  rows: ScoreBulkRow[],
): Promise<BulkResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { succeeded: 0, failed: [{ name: '전체', reason: '인증이 필요합니다.' }] }
  }

  const { data: members } = await adminSupabase
    .from('class_members')
    .select('student_id, users!student_id(name)')
    .eq('class_id', classId)
    .eq('is_active', true)

  const nameToId = new Map<string, string>()
  for (const m of members ?? []) {
    const u = m.users as unknown as { name: string } | null
    if (u?.name) nameToId.set(u.name, m.student_id)
  }

  let succeeded = 0
  const failed: Array<{ name: string; reason: string }> = []

  for (const row of rows) {
    const studentId = nameToId.get(row.name)
    if (!studentId) {
      failed.push({ name: row.name, reason: '학생을 찾을 수 없음' })
      continue
    }

    const { error } = await adminSupabase.from('test_scores').insert({
      class_id:     classId,
      student_id:   studentId,
      test_date:    testDate,
      score:        row.score,
      total_q:      row.total_q   ?? null,
      obj_q:        row.obj_q     ?? null,
      subj_q:       row.subj_q    ?? null,
      difficulty:   row.difficulty || null,
      input_method: 'omr',
    })

    if (error) {
      failed.push({ name: row.name, reason: `저장 실패: ${error.message}` })
    } else {
      succeeded++
    }
  }

  revalidatePath('/admin/scores')
  return { succeeded, failed }
}

export async function deleteScore(id: string): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }

  const { error } = await adminSupabase.from('test_scores').delete().eq('id', id)
  if (error) return { success: false, error: `삭제 실패: ${error.message}` }
  revalidatePath('/admin/scores')
  return { success: true }
}
