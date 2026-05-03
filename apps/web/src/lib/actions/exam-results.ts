'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증 필요')

  const { error } = await supabase
    .from('exam_results')
    .insert({
      student_id: data.studentId,
      class_id: data.classId,
      exam_name: data.examName,
      exam_type: data.examType,
      exam_date: data.examDate,
      score: data.score,
      max_score: data.maxScore,
      grade_cuts: data.gradeCuts as unknown as Record<string, unknown>,
      study_suggestion: data.studySuggestion || null,
      created_by: user.id,
    })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/exam-results')
}

export async function deleteExamResult(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증 필요')

  const { error } = await supabase
    .from('exam_results')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/exam-results')
}
