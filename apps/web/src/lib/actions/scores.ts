'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'
import { logger } from '@/lib/logger'

export type GradeCuts = {
  '1': number; '2': number; '3': number; '4': number; '5': number
  '6': number; '7': number; '8': number; '9': number
}

export type TestFormData = {
  classId: string
  title: string
  examType: '일반' | '모의고사' | '중간고사' | '기말고사' | '기타'
  testDate: string
  totalQ?: number
  objQ?: number
  subjQ?: number
  difficulty?: string
  maxScore?: number
  gradeCuts?: GradeCuts
}

export type ScoreEntry = {
  studentId: string
  score: number | null       // 미응시면 null
  isAbsent?: boolean
  absenceReason?: string
}

export type BulkScoreRow = {
  name: string
  score: number
}

export type BulkResult = {
  succeeded: number
  failed: Array<{ name: string; reason: string }>
}

export async function createTest(data: TestFormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('createTest', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }
    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase.from('tests').insert({
      class_id:   data.classId,
      title:      data.title,
      exam_type:  data.examType,
      test_date:  data.testDate,
      total_q:    data.totalQ    ?? null,
      obj_q:      data.objQ      ?? null,
      subj_q:     data.subjQ     ?? null,
      difficulty: data.difficulty || null,
      max_score:  data.maxScore  ?? 100,
      grade_cuts: data.gradeCuts ?? null,
      created_by: user.id,
    })
    if (error) throw error

    revalidatePath('/admin/scores')
    return { success: true }
  })
}

export async function deleteTest(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('deleteTest', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }
    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase.from('tests').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/admin/scores')
    return { success: true }
  })
}

export async function saveTestScores(testId: string, entries: ScoreEntry[]): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('saveTestScores', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }
    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const adminSupabase = createAdminClient()
    const { data: test } = await adminSupabase
      .from('tests')
      .select('class_id, test_date, total_q, obj_q, subj_q, difficulty')
      .eq('id', testId)
      .single()

    if (!test) return { success: false, error: '테스트를 찾을 수 없습니다.' }
    if (entries.length === 0) return { success: true }

    const studentIds = entries.map((e) => e.studentId)
    await adminSupabase.from('test_scores').delete().eq('test_id', testId).in('student_id', studentIds)

    const rows = entries.map((e) => ({
      test_id: testId, class_id: test.class_id, student_id: e.studentId,
      test_date: test.test_date,
      score: e.isAbsent ? null : e.score,
      is_absent: e.isAbsent ?? false,
      absence_reason: e.isAbsent ? (e.absenceReason?.trim() || null) : null,
      total_q: test.total_q ?? null, obj_q: test.obj_q ?? null,
      subj_q: test.subj_q ?? null, difficulty: test.difficulty ?? null,
      input_method: 'manual' as const,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminSupabase as any).from('test_scores').insert(rows)
    if (error) throw error

    revalidatePath(`/admin/scores/${testId}`)
    return { success: true }
  })
}

// bulkSaveTestScores는 복잡한 BulkResult 타입이라 withAction 외부에서 로깅 처리
export async function bulkSaveTestScores(testId: string, rows: BulkScoreRow[]): Promise<BulkResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { succeeded: 0, failed: [{ name: '전체', reason: '인증이 필요합니다.' }] }
  }

  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk'].includes(role ?? '')) {
    return { succeeded: 0, failed: [{ name: '전체', reason: '권한이 없습니다.' }] }
  }

  const adminSupabase = createAdminClient()

  const { data: test } = await adminSupabase
    .from('tests')
    .select('class_id, test_date, total_q, obj_q, subj_q, difficulty')
    .eq('id', testId)
    .single()

  if (!test) {
    return { succeeded: 0, failed: [{ name: '전체', reason: '테스트를 찾을 수 없습니다.' }] }
  }

  const { data: members } = await adminSupabase
    .from('class_members')
    .select('student_id, users!student_id(name)')
    .eq('class_id', test.class_id as string)
    .eq('is_active', true)

  const nameToId = new Map<string, string>()
  for (const m of members ?? []) {
    const u = m.users as { name: string } | null
    if (u?.name) nameToId.set(u.name, m.student_id as string)
  }

  const toInsert: Array<{
    test_id: string; class_id: string; student_id: string; test_date: string
    score: number; total_q: number | null; obj_q: number | null; subj_q: number | null
    difficulty: string | null; input_method: 'omr'
  }> = []
  const failed: Array<{ name: string; reason: string }> = []

  for (const row of rows) {
    const studentId = nameToId.get(row.name)
    if (!studentId) { failed.push({ name: row.name, reason: '학생을 찾을 수 없음' }); continue }
    toInsert.push({
      test_id: testId, class_id: test.class_id as string, student_id: studentId,
      test_date: test.test_date as string, score: row.score,
      total_q: (test.total_q as number | null) ?? null,
      obj_q: (test.obj_q as number | null) ?? null,
      subj_q: (test.subj_q as number | null) ?? null,
      difficulty: (test.difficulty as string | null) ?? null,
      input_method: 'omr',
    })
  }

  if (toInsert.length === 0) {
    revalidatePath(`/admin/scores/${testId}`)
    return { succeeded: 0, failed }
  }

  await adminSupabase.from('test_scores').delete().eq('test_id', testId).in('student_id', toInsert.map((r) => r.student_id))

  const { error } = await adminSupabase.from('test_scores').insert(toInsert)
  revalidatePath(`/admin/scores/${testId}`)

  if (error) {
    logger.error('bulkSaveTestScores:error', { action: 'bulkSaveTestScores', userId: user.id, error })
    return { succeeded: 0, failed: [...failed, { name: '전체', reason: `저장 실패: ${error.message}` }] }
  }

  return { succeeded: toInsert.length, failed }
}
