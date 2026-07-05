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
  if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) return { error: '권한이 없습니다.' }

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
  difficulty?: number | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) return { error: '권한이 없습니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: answerError } = await (supabase as any).from('qna_answers').insert({
    question_id: data.questionId,
    ta_id: user.id,
    content: data.content,
    media_urls: data.mediaUrls,
    is_ai_draft: data.isAiDraft,
    difficulty: data.difficulty ?? null,
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
  difficulty?: number | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) return { error: '권한이 없습니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let updateQuery = (supabase as any)
    .from('qna_answers')
    .update({ content: data.content, media_urls: data.mediaUrls, difficulty: data.difficulty ?? null })
    .eq('id', data.answerId)
  if (role !== 'teacher') {
    updateQuery = updateQuery.eq('ta_id', user.id)
  }
  const { error } = await updateQuery

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
  if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) return { error: '권한이 없습니다.' }

  const baseDeleteQuery = supabase.from('qna_answers').delete().eq('id', data.answerId)
  const { error: deleteError } = await (
    role === 'teacher' ? baseDeleteQuery : baseDeleteQuery.eq('ta_id', user.id)
  )

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

export async function rateAnswer(answerId: string, rating: number): Promise<{ error?: string }> {
  if (rating < 1 || rating > 5) return { error: '1~5점 사이의 값을 입력해주세요.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  // 학생 본인의 질문에 달린 답변인지 확인
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: answer } = await (admin as any)
    .from('qna_answers')
    .select('id, question_id, qna_questions!question_id(student_id)')
    .eq('id', answerId)
    .single()

  if (!answer) return { error: '답변을 찾을 수 없습니다.' }

  const studentId = (answer.qna_questions as { student_id: string } | null)?.student_id
  if (studentId !== user.id) return { error: '본인의 질문에 달린 답변만 평가할 수 있습니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('qna_answers')
    .update({ student_rating: rating, rated_at: new Date().toISOString() })
    .eq('id', answerId)

  if (error) return { error: '평점 저장에 실패했습니다.' }

  revalidatePath(`/dashboard/qna/${answer.question_id as string}`)
  revalidatePath('/admin/qna')
  return {}
}

export async function generateAiDraft(
  questionContent: string,
  imageUrls: string[] = [],
): Promise<{ draft?: string; mediaUrls?: string[]; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'Gemini API 키가 설정되지 않았습니다.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) return { error: '권한이 없습니다.' }

  try {
    const ai = new GoogleGenAI({ apiKey })

    const systemInstruction = `너는 수학 학원의 조교다. 학생의 질문에 대해 조교가 검토 후 보낼 "답변 초안"을 작성한다.

**목표: 정답을 알려주는 것이 아니라, 학생이 스스로 다음 단계를 밟도록 유도하는 것.**

규칙 (엄수):
1. 최종 답·최종 계산 결과를 직접 알려주지 말 것. 방향과 힌트만 제시.
2. 이미지가 있으면 이미지 속 문제를 먼저 정확히 읽고, 질문 텍스트와 함께 학생이 "어디서 막혔는지"를 파악한 뒤 답할 것.
3. 전체 8줄 이내. 같은 내용을 표현만 바꿔 반복하지 말 것 — 각 섹션은 서로 다른 정보만 담는다.
4. 한국어로만 작성 (수식 제외).

수식 규칙 (렌더러: KaTeX):
- 인라인 $x^2$, 블록 $$\\frac{a}{b}$$ 만 사용. \\( \\) 나 \\[ \\] 금지.
- 수식 안에 한글을 넣지 말 것. 설명은 수식 밖에 쓴다.
- 여러 줄 수식은 $$...$$ 안에서 aligned 환경만 사용.
- 출력 전에 수식이 KaTeX 문법상 유효한지 스스로 검증할 것.

출력 형식 (태그 포함 그대로, 다른 내용 추가 금지):
###CHECK###
(문제와 질문 의도 확인 1문장 — 이미지의 문제를 어떻게 읽었고 학생이 무엇을 묻는지. 조교가 오독 여부를 검증하는 용도)
###CONCEPT###
(이 문제를 뚫는 핵심 개념·성질 딱 하나, 1~2줄)
###NEXTSTEP###
(학생이 스스로 풀도록 유도하는 다음 단계 1~3개. 번호 목록. 각 항목은 "~해 보세요" 또는 되묻는 질문 형태. 마지막 단계의 답까지 쓰지 말 것)
###END###`

    const contentsParts: Array<string | { inlineData: { data: string; mimeType: string } }> = []

    // 이미지를 먼저 배치 — 텍스트보다 앞에 있어야 인식 정확도가 높음
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

    contentsParts.push(
      imageUrls.length > 0
        ? `위 이미지가 학생이 첨부한 문제/풀이 사진이다.\n\n학생 질문: ${questionContent}`
        : `학생 질문: ${questionContent}`,
    )

    const response = await ai.models.generateContent({
      // flash-lite는 수식·손글씨 이미지 인식이 약해 flash로 상향
      model: 'gemini-2.5-flash',
      contents: contentsParts,
      config: {
        systemInstruction,
        temperature: 0.3,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 512 },
      },
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

    const check    = extractSection(rawText, 'CHECK')
    const concept  = extractSection(rawText, 'CONCEPT')
    const nextStep = extractSection(rawText, 'NEXTSTEP')

    if (!check && !concept && !nextStep) {
      // 태그 없이 답변한 경우 — 태그 흔적만 제거하고 원문 사용
      logger.warn('generateAiDraft:parse-failed', { action: 'generateAiDraft', userId: user.id, input: rawText.slice(0, 300) })
      const fallback = rawText.replace(/###[A-Z]+###/g, '').trim()
      if (!fallback) return { error: 'AI 응답 형식을 파싱할 수 없습니다. 다시 시도해 주세요.' }
      return { draft: fallback, mediaUrls }
    }

    const draft = [check, concept, nextStep].filter(Boolean).join('\n\n')
    return { draft, mediaUrls }
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
  textbookId?: string | null
  problemNumber?: string | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '인증이 필요합니다.' }

  const studentName = (user.user_metadata?.name as string | undefined) ?? '학생'

  // textbook_id and problem_number columns added via migration 026
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, data: inserted } = await (supabase as any)
    .from('qna_questions')
    .insert({
      student_id: user.id,
      class_id: data.classId || null,
      title: data.title,
      content: data.content,
      image_urls: data.imageUrls,
      status: 'open',
      textbook_id: data.textbookId || null,
      problem_number: data.problemNumber?.trim() || null,
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
      .in('role', ['teacher', 'ta_desk', 'ta_assistant'])
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
