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

  const { error: qError } = await supabase
    .from('qna_questions')
    .update({ status: 'answered', assigned_ta_id: user.id })
    .eq('id', data.questionId)

  if (qError) return { error: '질문 상태 업데이트에 실패했습니다.' }

  revalidatePath('/admin/qna')
  revalidatePath(`/admin/qna/${data.questionId}`)
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
