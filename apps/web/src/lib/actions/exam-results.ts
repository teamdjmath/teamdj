'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/actions'
import type { Json } from '@/types/supabase'

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
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('createExamResult', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }

    const { error } = await supabase.from('exam_results').insert({
      student_id:       data.studentId,
      class_id:         data.classId,
      exam_name:        data.examName,
      exam_type:        data.examType,
      exam_date:        data.examDate,
      score:            data.score,
      max_score:        data.maxScore,
      grade_cuts:       data.gradeCuts as unknown as Json,
      study_suggestion: data.studySuggestion || null,
      created_by:       user.id,
    })
    if (error) throw error

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
