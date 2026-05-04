'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function assignQuestion(questionId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { error: '권한이 없습니다.' }

  const { error } = await supabase
    .from('qna_questions')
    .update({ assigned_ta_id: user.id, status: 'in_progress' })
    .eq('id', questionId)

  if (error) return { error: '담당 지정에 실패했습니다.' }
  revalidatePath('/admin/qna')
  revalidatePath(`/admin/qna/${questionId}`)
  return {}
}

export async function submitAnswer(data: {
  questionId: string
  content: string
  mediaUrls: string[]
  isAiDraft: boolean
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { error: '권한이 없습니다.' }

  const { error: answerError } = await supabase.from('qna_answers').insert({
    question_id: data.questionId,
    ta_id: user.id,
    content: data.content,
    media_urls: data.mediaUrls,
    is_ai_draft: data.isAiDraft,
  })

  if (answerError) return { error: '답변 등록에 실패했습니다.' }

  const { error: qError, data: qData } = await supabase
    .from('qna_questions')
    .update({ status: 'answered', assigned_ta_id: user.id })
    .eq('id', data.questionId)
    .select('student_id')
    .single()

  if (qError) return { error: '질문 상태 업데이트에 실패했습니다.' }

  if (qData?.student_id) {
    await supabase.from('push_messages').insert({
      sender_id: user.id,
      target_student_id: qData.student_id,
      message: '질문에 대한 답변이 등록되었습니다.',
    })
  }

  revalidatePath('/admin/qna')
  revalidatePath(`/admin/qna/${data.questionId}`)
  revalidatePath('/dashboard/qna')
  revalidatePath(`/dashboard/qna/${data.questionId}`)
  return {}
}

export async function generateAiDraft(
  questionContent: string,
): Promise<{ draft?: string; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'Gemini API 키가 설정되지 않았습니다.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `다음 수학 문제 또는 질문에 대해 단계별로 풀이를 설명해줘. 수식은 LaTeX 형식($...$)으로 작성해줘.\n\n질문: ${questionContent}`,
                },
              ],
            },
          ],
        }),
      },
    )

    if (!res.ok) return { error: 'AI 초안 생성에 실패했습니다.' }

    const body = await res.json()
    const draft = body.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
    if (!draft) return { error: 'AI 응답을 받지 못했습니다.' }
    return { draft }
  } catch {
    return { error: 'AI 초안 생성 중 오류가 발생했습니다.' }
  }
}

export async function createQuestion(data: {
  title: string
  content: string
  classId: string | null
  imageUrls: string[]
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '인증이 필요합니다.' }

  const { error } = await supabase
    .from('qna_questions')
    .insert({
      student_id: user.id,
      class_id: data.classId || null,
      title: data.title,
      content: data.content,
      image_urls: data.imageUrls,
      status: 'open',
    })

  if (error) {
    return { error: '질문 등록에 실패했습니다.' }
  }

  revalidatePath('/dashboard/qna')
  revalidatePath('/admin/qna')
  return {}
}

export async function deleteQuestion(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '인증이 필요합니다.' }

  const { data: question, error: fetchError } = await supabase
    .from('qna_questions')
    .select('status, student_id')
    .eq('id', id)
    .single()

  if (fetchError || !question) return { error: '질문을 찾을 수 없습니다.' }
  if (question.student_id !== user.id) return { error: '권한이 없습니다.' }
  if (question.status !== 'open') return { error: '미답변 상태인 질문만 삭제할 수 있습니다.' }

  const { error } = await supabase
    .from('qna_questions')
    .delete()
    .eq('id', id)

  if (error) return { error: '삭제에 실패했습니다.' }

  revalidatePath('/dashboard/qna')
  revalidatePath('/admin/qna')
  return {}
}
