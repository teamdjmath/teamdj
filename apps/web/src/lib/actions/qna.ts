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
      is_system: true,
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

export type AiDraftMode = 'hint' | 'full'

export async function generateAiDraft(
  questionContent: string,
  imageUrls: string[] = [],
  mode: AiDraftMode = 'hint',
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

    const scopeRules = mode === 'full'
      ? `답변 범위: **최종 답까지 완전한 풀이**를 제시한다.
- 반드시 풀이 전체를 속으로 먼저 완성해 답을 확정한 뒤, **확정된 풀이만** 서술할 것.
- 시도하다 버린 접근, "다른 방법을 고려합니다", "하지만 ~이 아닙니다" 같은 탐색·번복·자기수정 과정은 절대 출력하지 말 것. 학생에게는 완성된 풀이 하나만 보여야 한다.
- 풀이 본체는 교과서 해설지(EBS 해설)처럼 간결하게: 가장 짧고 표준적인 경로 하나만 택하고, 각 단계는 "어느 도형에서 무슨 법칙" 한 마디 + 수식이면 충분하다. 연결은 "~이므로", "따라서" 수준으로만 하고 설명 문장을 늘어놓지 말 것.
- 단 하나의 예외: **학생이 질문한 바로 그 지점**(예: 보조선을 어디에 왜 긋는지, 그 발상이 어디서 나오는지)은 2~4문장으로 공들여 설명할 것. 나머지 단계는 전부 짧게.
- 핵심 수식은 인라인으로 길게 잇지 말고 $$...$$ 블록으로 한 줄씩 분리할 것.
- 자명한 산술 중간 단계는 생략할 것 (예: $\\sqrt{9+16}=\\sqrt{25}=5$ 전부 대신 $\\overline{AC}=5$만).
- 마지막 줄에 "**최종 답:** ..." 형태로 답을 명시하고 끝낼 것.`
      : `답변 범위: **학생이 물어본 것에만** 답한다. 최종 답·최종 계산 결과는 알려주지 말 것.
- 첫 줄부터 질문에 대한 직접적인 답(예: 어떤 보조선을 그어야 하는지, 어떤 성질을 쓰는지)을 제시할 것.
- 그 다음 학생이 스스로 이어서 풀 수 있게 다음 단계 1~3개를 번호 목록으로. 마지막 단계의 답은 쓰지 말 것.
- 전체 10줄 이내.`

    const systemInstruction = `너는 수학 학원의 조교다. 학생의 질문에 대해 조교가 검토 후 보낼 "답변 초안"을 작성한다.

말투 규칙 (엄수):
1. 실제 사람 조교가 쓰는 자연스러운 존댓말로, 첫 문장부터 바로 수학 내용을 말할 것.
2. 학생의 상태나 질문 의도를 분석·요약하는 메타 문장 절대 금지 — "~로 보입니다", "~하시는 것 같습니다", "~를 파악했습니다", "학생은/학생이 ~" 같은 표현 쓰지 말 것.
3. 문제 조건을 그대로 길게 되풀이하지 말 것. 풀이에 필요한 조건만 그 자리에서 짧게 인용.
4. 이미지가 있으면 이미지 속 문제를 정확히 읽고 답할 것.
5. 같은 내용을 표현만 바꿔 반복하지 말 것.
6. 한국어로만 작성 (수식 제외).

${scopeRules}

수식 규칙 (렌더러: KaTeX):
- 인라인 $x^2$, 블록 $$\\frac{a}{b}$$ 만 사용. \\( \\) 나 \\[ \\] 금지.
- 수식 안에 한글을 넣지 말 것. 설명은 수식 밖에 쓴다.
- 여러 줄 수식은 $$...$$ 안에서 aligned 환경만 사용.
- 출력 전에 수식이 KaTeX 문법상 유효한지 스스로 검증할 것.

출력 형식: 다른 태그나 제목 없이, 학생에게 보낼 답변 본문(마크다운)만 출력할 것.`

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
        // full 모드: 사고 예산이 부족하면 모델이 답변 텍스트 안에서 문제를 풀며 헤매는 과정이
        // 그대로 노출됨 — thinkingBudget -1(동적)로 난이도에 맞게 알아서 충분히 사고하게 한다.
        // Gemini 2.5는 thinking 토큰도 maxOutputTokens에 포함되고 budget을 초과할 수 있어서,
        // 어려운 문제에서 한도가 작으면 MAX_TOKENS로 잘림 → 모델 최대치(65536)로 연다.
        // 실제 답변 길이는 프롬프트(EBS 해설 수준 간결함)로 제어한다.
        maxOutputTokens: mode === 'full' ? 65536 : 4096,
        thinkingConfig: { thinkingBudget: mode === 'full' ? -1 : 1024 },
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

    // 토큰 사용량 기록 (모니터링 예상 요금 산출용) — 실패해도 초안 생성에 영향 없음.
    // 잘리거나 버려진 응답도 과금은 되므로 파싱 결과와 무관하게 기록한다.
    try {
      const usage = response.usageMetadata
      await admin.from('ai_usage_logs').insert({
        user_id: user.id,
        feature: 'qna_draft',
        mode,
        model: 'gemini-2.5-flash',
        prompt_tokens: usage?.promptTokenCount ?? 0,
        thoughts_tokens: usage?.thoughtsTokenCount ?? 0,
        output_tokens: usage?.candidatesTokenCount ?? 0,
      })
    } catch (e) {
      logger.warn('generateAiDraft:usage-log-failed', { action: 'generateAiDraft', userId: user.id, error: e })
    }

    if (!rawText) return { error: 'AI 응답을 받지 못했습니다.' }

    // 토큰 한도로 풀이가 중간에 끊긴 초안은 그대로 쓰면 안 됨 — 재시도 유도
    const finishReason = String(response.candidates?.[0]?.finishReason ?? '')
    if (finishReason === 'MAX_TOKENS') {
      logger.warn('generateAiDraft:truncated', { action: 'generateAiDraft', userId: user.id, input: rawText.slice(-200) })
      return { error: '풀이가 너무 길어 응답이 중간에 잘렸습니다. 다시 시도해 주세요.' }
    }

    logger.info('generateAiDraft:raw', { action: 'generateAiDraft', userId: user.id, input: rawText.slice(0, 500) })

    // 모델이 관성으로 예전 형식의 태그를 붙여도 본문만 남긴다
    const draft = rawText.replace(/###[A-Z]+###/g, '').trim()
    if (!draft) return { error: 'AI 응답을 파싱할 수 없습니다. 다시 시도해 주세요.' }
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
