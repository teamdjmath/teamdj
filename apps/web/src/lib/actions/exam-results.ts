'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'
import { asJson } from '@/types/db'
import { estimateGrade, gradeSystemOf } from '@/lib/grade'

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
  examDifficulty?: string
  rankInExam?: number | null
  totalInExam?: number | null
  autoRank?: boolean
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('createExamResult', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const row = {
      student_id:       data.studentId,
      class_id:         data.classId,
      exam_name:        data.examName,
      exam_type:        data.examType,
      exam_date:        data.examDate,
      score:            data.score,
      max_score:        data.maxScore,
      grade_cuts:       asJson(data.gradeCuts),
      study_suggestion: data.studySuggestion || null,
      exam_difficulty:  data.examDifficulty || null,
      created_by:       user.id,
      rank_in_exam:     data.rankInExam ?? null,
      total_in_exam:    data.totalInExam ?? null,
      auto_rank:        data.autoRank ?? false,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { error } = await (supabase as any).from('exam_results').insert(row)

    // 072 마이그레이션(exam_difficulty 컬럼) 미적용 환경 대비 — 없는 컬럼 때문에
    // 시험 결과 등록 자체가 막히지 않도록 그 필드만 빼고 재시도
    if (error?.code === 'PGRST204' && error.message?.includes('exam_difficulty')) {
      const { exam_difficulty: _drop, ...legacyRow } = row
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;({ error } = await (supabase as any).from('exam_results').insert(legacyRow))
    }
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
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error: fetchErr } = await (supabase as any)
      .from('exam_results')
      .select('id, score, grade_cuts')
      .eq('exam_name', examName)
      .eq('exam_date', examDate)

    if (fetchErr) throw fetchErr
    if (!rows || rows.length === 0) return { success: false, error: '해당 시험 결과가 없습니다.' }

    type Row = { id: string; score: number; grade_cuts: Record<string, number> | null }
    const typedRows = rows as Row[]
    const sorted = [...typedRows].sort((a, b) => b.score - a.score)
    const total = sorted.length
    const allScores = typedRows.map((r) => r.score)

    // 예상 등급: 이 시험 응시자 전체의 평균·표준편차로 정규분포 근사 —
    // 학원 등급컷(grade_cuts)과 무관한 별도 통계 추정치이므로 항상 함께 저장하되
    // UI에서 "추정치" 고지를 반드시 붙인다.
    for (let i = 0; i < sorted.length; i++) {
      const row = sorted[i]
      const rank = i + 1
      const system = gradeSystemOf(row.grade_cuts ?? {})
      const estimate = estimateGrade(row.score, allScores, system)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: upErr } = await (supabase as any)
        .from('exam_results')
        .update({
          rank_in_exam:         rank,
          total_in_exam:        total,
          auto_rank:            true,
          estimated_grade:      estimate?.grade ?? null,
          estimated_percentile: estimate?.percentile ?? null,
        })
        .eq('id', row.id)
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
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const { error } = await supabase.from('exam_results').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/admin/exam-results')
    return { success: true }
  })
}
