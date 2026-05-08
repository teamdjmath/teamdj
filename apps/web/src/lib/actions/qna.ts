'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { GoogleGenAI } from '@google/genai'
import { logger } from '@/lib/logger'
import { createNotification } from '@/lib/actions/notifications'

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
    .select('student_id, title')
    .single()

  if (qError) return { error: '질문 상태 업데이트에 실패했습니다.' }

  if (qData?.student_id) {
    await supabase.from('push_messages').insert({
      sender_id: user.id,
      student_id: qData.student_id,
      content: '질문에 대한 답변이 등록되었습니다.',
    })
    try {
      await createNotification(
        qData.student_id,
        'qna_answered',
        '질문에 답변이 등록되었습니다',
        `${qData.title}에 답변이 달렸습니다`,
        `/dashboard/qna/${data.questionId}`,
      )
    } catch (err) {
      logger.warn('submitAnswer:notification-failed', { action: 'submitAnswer', userId: user.id, error: err })
    }
  }

  revalidatePath('/admin/qna')
  revalidatePath(`/admin/qna/${data.questionId}`)
  revalidatePath('/dashboard/qna')
  revalidatePath(`/dashboard/qna/${data.questionId}`)
  return {}
}

export async function updateAnswer(data: {
  answerId: string
  questionId: string
  content: string
  mediaUrls: string[]
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { error: '권한이 없습니다.' }

  const { error } = await supabase
    .from('qna_answers')
    .update({ content: data.content, media_urls: data.mediaUrls })
    .eq('id', data.answerId)
    .eq('ta_id', user.id)

  if (error) return { error: '답변 수정에 실패했습니다.' }

  revalidatePath('/admin/qna')
  revalidatePath(`/admin/qna/${data.questionId}`)
  revalidatePath('/dashboard/qna')
  revalidatePath(`/dashboard/qna/${data.questionId}`)
  return {}
}

export async function cancelAnswer(data: {
  questionId: string
  answerId: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { error: '권한이 없습니다.' }

  const { error: deleteError } = await supabase
    .from('qna_answers')
    .delete()
    .eq('id', data.answerId)
    .eq('ta_id', user.id)

  if (deleteError) return { error: '답변 취소에 실패했습니다.' }

  await supabase
    .from('qna_questions')
    .update({ status: 'open', assigned_ta_id: null })
    .eq('id', data.questionId)

  revalidatePath('/admin/qna')
  revalidatePath(`/admin/qna/${data.questionId}`)
  revalidatePath('/dashboard/qna')
  revalidatePath(`/dashboard/qna/${data.questionId}`)
  return {}
}

export async function generateAiDraft(
  questionContent: string,
  imageUrls: string[] = [],
): Promise<{ sections?: { praise: string; keyPoint: string; solution: string }; mediaUrls?: string[]; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'Gemini API 키가 설정되지 않았습니다.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { error: '권한이 없습니다.' }

  try {
    const ai = new GoogleGenAI({ apiKey })

    const promptText = `다음 질문에 대해 아래 형식으로 정확히 답변해줘. 형식 이외의 다른 텍스트는 포함하지 마.
수식은 LaTeX 형식($...$, $$...$$)으로 작성하고, 마크다운(**, *, \`, 목록)을 자유롭게 사용해줘.
학생이 첨부한 이미지가 있다면 참고해서 답변을 작성해줘.

###PRAISE###
(학생의 질문에 대한 칭찬 또는 공감, 1~2문장)

###KEYPOINT###
(핵심 개념 또는 주의할 점, 마크다운+LaTeX 허용)

###SOLUTION###
(단계별 풀이, 마크다운+LaTeX 허용)

###END###

질문: ${questionContent}`

    const contentsParts: Array<string | { inlineData: { data: string; mimeType: string } }> = [promptText]

    // 학생 첨부 이미지 포함
    if (imageUrls.length > 0) {
      for (const url of imageUrls) {
        try {
          const imgRes = await fetch(url)
          if (imgRes.ok) {
            const arrayBuffer = await imgRes.arrayBuffer()
            const base64 = Buffer.from(arrayBuffer).toString('base64')
            const mimeType = imgRes.headers.get('content-type') || 'image/png'
            contentsParts.push({
              inlineData: {
                data: base64,
                mimeType,
              },
            })
          }
        } catch (e) {
          logger.warn('generateAiDraft:image-fetch-failed', { action: 'generateAiDraft', userId: user.id, error: e })
        }
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: contentsParts,
    })
    
    let rawText = ''
    const mediaUrls: string[] = []
    const admin = createAdminClient()

    const parts = response.candidates?.[0]?.content?.parts ?? []
    for (const part of parts) {
      if (part.text) {
        rawText += part.text
      } else if (part.inlineData && part.inlineData.data) {
        const imageData = part.inlineData.data
        const contentType = part.inlineData.mimeType || 'image/png'
        const buffer = Buffer.from(imageData, 'base64')
        const ext = contentType.split('/')[1] || 'png'
        const filePath = `ai-drafts/${user.id}/${Date.now()}.${ext}`

        const { error: uploadError } = await admin.storage
          .from('qna-images')
          .upload(filePath, buffer, { contentType, upsert: true })

        if (!uploadError) {
          const { data: { publicUrl } } = admin.storage.from('qna-images').getPublicUrl(filePath)
          mediaUrls.push(publicUrl)
        }
      }
    }

    if (!rawText) return { error: 'AI 응답을 받지 못했습니다.' }

    logger.info('generateAiDraft:raw', { action: 'generateAiDraft', userId: user.id, input: rawText.slice(0, 500) })

    function extractSection(text: string, tag: string): string {
      const re = new RegExp(`###${tag}###\\s*([\\s\\S]*?)(?=###[A-Z]+###|$)`, 'i')
      return text.match(re)?.[1]?.trim() ?? ''
    }

    const praise = extractSection(rawText, 'PRAISE')
    const keyPoint = extractSection(rawText, 'KEYPOINT')
    const solution = extractSection(rawText, 'SOLUTION')

    if (!praise && !keyPoint && !solution) {
      logger.warn('generateAiDraft:parse-failed', { action: 'generateAiDraft', userId: user.id, input: rawText.slice(0, 300) })
      return { error: 'AI 응답 형식을 파싱할 수 없습니다. 다시 시도해 주세요.' }
    }

    return { sections: { praise, keyPoint, solution }, mediaUrls }
  } catch (err: unknown) {
    logger.error('generateAiDraft:error', { action: 'generateAiDraft', userId: user.id, error: err })
    
    let errorMsg = 'AI 초안 생성 중 오류가 발생했습니다.'
    
    if (err instanceof Error) {
      const msg = err.message
      if (msg.includes('429') || msg.includes('Quota exceeded') || msg.includes('RESOURCE_EXHAUSTED')) {
        errorMsg = 'AI API 호출 한도(Quota)를 초과했습니다. (무료 티어 제한 또는 할당량 부족). 잠시 후 다시 시도하거나 API 키 플랜을 확인해주세요.'
      } else {
        // JSON 형태의 에러 메시지 파싱 시도
        try {
          const match = msg.match(/"message":"(.*?)"/)
          if (match && match[1]) {
            errorMsg = `AI 오류: ${match[1]}`
          } else {
            errorMsg = `AI 오류: ${msg.split('\n')[0]}`
          }
        } catch {
          errorMsg = `AI 오류: ${msg}`
        }
      }
    }
    
    return { error: errorMsg }
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

  const studentName = (user.user_metadata?.name as string | undefined) ?? '학생'

  const { error, data: inserted } = await supabase
    .from('qna_questions')
    .insert({
      student_id: user.id,
      class_id: data.classId || null,
      title: data.title,
      content: data.content,
      image_urls: data.imageUrls,
      status: 'open',
    })
    .select('id')
    .single()

  if (error) {
    return { error: '질문 등록에 실패했습니다.' }
  }

  // 전체 선생님/조교에게 알림 전송
  try {
    const admin = createAdminClient()
    const { data: staff } = await admin
      .from('users')
      .select('id')
      .in('role', ['teacher', 'ta'])
      .eq('is_active', true)

    if (staff && staff.length > 0 && inserted?.id) {
      await Promise.all(
        staff.map((s) =>
          createNotification(
            s.id as string,
            'qna_new',
            '새 질문이 등록되었습니다',
            `${studentName}: ${data.title}`,
            `/admin/qna/${inserted.id}`,
          ),
        ),
      )
    }
  } catch (err) {
    logger.warn('createQuestion:notification-failed', { action: 'createQuestion', userId: user.id, error: err })
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
