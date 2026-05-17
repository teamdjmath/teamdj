'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'
import { asJson } from '@/types/db'

export async function createExamResult(data: {
  studentId: string
  classId: string
  examName: string
  examType: string
  examDate: string
  score: number
  maxScore: number
  gradeCuts: Record<string, number>
  studySuggestion: string
  rankInExam?: number | null
  totalInExam?: number | null
  autoRank?: boolean
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('createExamResult', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('exam_results').insert({
      student_id:       data.studentId,
      class_id:         data.classId,
      exam_name:        data.examName,
      exam_type:        data.examType,
      exam_date:        data.examDate,
      score:            data.score,
      max_score:        data.maxScore,
      grade_cuts:       asJson(data.gradeCuts),
      study_suggestion: data.studySuggestion || null,
      created_by:       user.id,
      rank_in_exam:     data.rankInExam ?? null,
      total_in_exam:    data.totalInExam ?? null,
      auto_rank:        data.autoRank ?? false,
    })
    if (error) throw error

    revalidatePath('/admin/exam-results')
    return { success: true }
  })
}

export async function autoRankExam(examName: string, examDate: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('autoRankExam', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error: fetchErr } = await (supabase as any)
      .from('exam_results')
      .select('id, score')
      .eq('exam_name', examName)
      .eq('exam_date', examDate)

    if (fetchErr) throw fetchErr
    if (!rows || rows.length === 0) return { success: false, error: '해당 시험 결과가 없습니다.' }

    const sorted = [...rows].sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    const total = sorted.length

    for (let i = 0; i < sorted.length; i++) {
      const rank = i + 1
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: upErr } = await (supabase as any)
        .from('exam_results')
        .update({ rank_in_exam: rank, total_in_exam: total, auto_rank: true })
        .eq('id', sorted[i].id)
      if (upErr) throw upErr
    }

    revalidatePath('/admin/exam-results')
    return { success: true }
  })
}

export async function deleteExamResult(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('deleteExamResult', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }

    const { error } = await supabase.from('exam_results').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/admin/exam-results')
    return { success: true }
  })
}
