'use server'

import { createClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { GoogleGenAI, Modality } from '@google/genai'
import { logger } from '@/lib/logger'
import { createNotification } from '@/lib/actions/notifications'
import { checkSuspension } from '@/lib/suspension'
import { findRelatedAnswers } from '@/lib/data/qna-related'

export async function assignQuestion(questionId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getVerifiedUser()
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

export type AiFeedbackCategory = 'wrong_answer' | 'unclear_explanation' | 'mismatched_problem' | 'other'

// 학생이 "조교님께 추가 답변 요청하기"를 눌렀을 때 — AI 초안(또는 유사 문항 자동 연결 답변)만으로
// 충분하지 않을 때 조교 큐로 명시적으로 올린다. 답변중(조교 대기)으로 전환하고, 조교 목록에
// "추가 요청" 뱃지가 뜨도록 additional_requested_at을 기록한다. 조교가 답변을 확정하면 다시
// null로 돌아간다. 어떤 부분이 부족했는지는 qna_ai_feedback에 별도로 남겨 모니터링에서 집계한다.
export async function requestAdditionalAnswer(
  questionId: string,
  feedback?: { category: AiFeedbackCategory; detail?: string },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getVerifiedUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { data: question } = await supabase
    .from('qna_questions')
    .select('student_id, status, title')
    .eq('id', questionId)
    .single()

  if (!question) return { error: '질문을 찾을 수 없습니다.' }
  if (question.student_id !== user.id) return { error: '본인의 질문만 요청할 수 있습니다.' }
  if (question.status === 'answered') return { error: '이미 답변이 완료된 질문입니다.' }

  const now = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('qna_questions')
    .update({ status: 'in_progress', additional_requested_at: now })
    .eq('id', questionId)

  if (error) return { error: '요청에 실패했습니다.' }

  if (feedback) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: feedbackError } = await (supabase as any).from('qna_ai_feedback').insert({
      question_id: questionId,
      student_id: user.id,
      category: feedback.category,
      detail: feedback.detail?.trim() || null,
    })
    if (feedbackError) {
      logger.warn('requestAdditionalAnswer:feedback-save-failed', { action: 'requestAdditionalAnswer', userId: user.id, error: feedbackError })
    }
  }

  try {
    const admin = createAdminClient()
    const { data: staff } = await admin
      .from('users')
      .select('id')
      .in('role', ['teacher', 'ta_desk', 'ta_assistant'])
      .eq('is_active', true)

    if (staff && staff.length > 0) {
      await Promise.all(
        staff.map((s) =>
          createNotification(
            s.id as string,
            'qna_new',
            '조교 답변을 요청했습니다',
            `${question.title}에 대해 학생이 추가 답변을 요청했습니다`,
            `/admin/qna/${questionId}`,
          ),
        ),
      )
    }
  } catch (err) {
    logger.warn('requestAdditionalAnswer:notification-failed', { action: 'requestAdditionalAnswer', userId: user.id, error: err })
  }

  revalidatePath('/admin/qna')
  revalidatePath(`/admin/qna/${questionId}`)
  revalidatePath('/dashboard/qna')
  revalidatePath(`/dashboard/qna/${questionId}`)
  return {}
}

// 학생이 AI 1차 답변을 그대로 확정 — 조교 개입 없이 바로 답변완료 처리한다.
// (조교가 검수한 게 아니므로 학생 화면의 AI 고지 문구는 buildStudentContent에서 별도로 구분한다.)
export async function confirmAiDraft(questionId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getVerifiedUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { data: question } = await supabase
    .from('qna_questions')
    .select('student_id, status')
    .eq('id', questionId)
    .single()

  if (!question) return { error: '질문을 찾을 수 없습니다.' }
  if (question.student_id !== user.id) return { error: '본인의 질문만 확정할 수 있습니다.' }
  if (question.status === 'answered') return { error: '이미 답변이 완료된 질문입니다.' }

  const { data: draft } = await supabase
    .from('qna_answers')
    .select('id')
    .eq('question_id', questionId)
    .is('ta_id', null)
    .maybeSingle()
  if (!draft) return { error: '아직 답변이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('qna_questions')
    .update({ status: 'answered', additional_requested_at: null })
    .eq('id', questionId)

  if (error) return { error: '확정에 실패했습니다.' }

  revalidatePath('/admin/qna')
  revalidatePath(`/admin/qna/${questionId}`)
  revalidatePath('/dashboard/qna')
  revalidatePath(`/dashboard/qna/${questionId}`)
  return {}
}

// 답변 저장(insert) 이후 공통 처리 — 질문 상태 변경 + 학생 알림.
// submitAnswer(직접 작성)와 adoptRelatedAnswer(유사 답변 채택) 둘 다 사용.
async function finalizeAnsweredQuestion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  questionId: string,
  taId: string,
  notificationBody: string,
): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: qError, data: qData } = await (supabase as any)
    .from('qna_questions')
    .update({ status: 'answered', assigned_ta_id: taId, additional_requested_at: null })
    .eq('id', questionId)
    .select('student_id, title')
    .single()

  if (qError) return { error: '질문 상태 업데이트에 실패했습니다.' }

  if (qData?.student_id) {
    await supabase.from('push_messages').insert({
      sender_id: taId,
      student_id: qData.student_id,
      content: notificationBody,
      is_system: true,
    })
    try {
      await createNotification(
        qData.student_id,
        'qna_answered',
        '질문에 답변이 등록되었습니다',
        `${qData.title}에 답변이 달렸습니다`,
        `/dashboard/qna/${questionId}`,
      )
    } catch (err) {
      logger.warn('finalizeAnsweredQuestion:notification-failed', { action: 'finalizeAnsweredQuestion', userId: taId, error: err })
    }
  }

  revalidatePath('/admin/qna')
  revalidatePath(`/admin/qna/${questionId}`)
  revalidatePath('/dashboard/qna')
  revalidatePath(`/dashboard/qna/${questionId}`)
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
  const user = await getVerifiedUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) return { error: '권한이 없습니다.' }

  // 난이도는 필수 — 답변 통계·추천 난이도의 기반 데이터라 누락을 허용하지 않는다
  if (data.difficulty == null) return { error: '난이도를 설정해야 답변을 등록할 수 있습니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: answerError } = await (supabase as any).from('qna_answers').insert({
    question_id: data.questionId,
    ta_id: user.id,
    content: data.content,
    media_urls: data.mediaUrls,
    is_ai_draft: data.isAiDraft,
    difficulty: data.difficulty,
  })

  if (answerError) return { error: '답변 등록에 실패했습니다.' }

  return finalizeAnsweredQuestion(supabase, data.questionId, user.id, '질문에 대한 답변이 등록되었습니다.')
}

// 유사 문항 답변을 조교가 확인만으로 채택 — 원본 답변 내용·난이도를 그대로 복사해
// 새 답변으로 등록한다. 채택 후에도 이 질문은 여느 답변과 동일하게 수정·재답변 가능.
export async function adoptRelatedAnswer(data: {
  questionId: string
  sourceQuestionId: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getVerifiedUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) return { error: '권한이 없습니다.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: source, error: sourceError } = await (admin as any)
    .from('qna_answers')
    .select('content, media_urls, difficulty')
    .eq('question_id', data.sourceQuestionId)
    .order('answered_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (sourceError || !source) return { error: '원본 답변을 찾을 수 없습니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: answerError } = await (supabase as any).from('qna_answers').insert({
    question_id: data.questionId,
    ta_id: user.id,
    content: source.content,
    media_urls: source.media_urls ?? [],
    is_ai_draft: false,
    difficulty: source.difficulty ?? null,
    adopted_from_question_id: data.sourceQuestionId,
  })

  if (answerError) return { error: '답변 채택에 실패했습니다.' }

  return finalizeAnsweredQuestion(supabase, data.questionId, user.id, '비슷한 문항의 기존 답변으로 질문이 해결되었습니다.')
}

export async function updateAnswer(data: {
  answerId: string
  questionId: string
  content: string
  mediaUrls: string[]
  difficulty?: number | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getVerifiedUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) return { error: '권한이 없습니다.' }

  if (data.difficulty == null) return { error: '난이도를 설정해야 답변을 저장할 수 있습니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let updateQuery = (supabase as any)
    .from('qna_answers')
    .update({ content: data.content, media_urls: data.mediaUrls, difficulty: data.difficulty })
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
  const user = await getVerifiedUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) return { error: '권한이 없습니다.' }

  // .select()로 실제 삭제된 행을 받아야 한다 — ta_desk·ta_assistant가 남의 답변을 취소하려 하면
  // ta_id 필터에 안 걸려 delete가 0건 처리되는데, select 없이는 이것도 "성공"으로 보여
  // 질문 상태만 미답변으로 되돌아가고 원본 답변은 그대로 남는 불일치가 생겼다.
  const baseDeleteQuery = supabase.from('qna_answers').delete().eq('id', data.answerId)
  const { data: deleted, error: deleteError } = await (
    role === 'teacher' ? baseDeleteQuery : baseDeleteQuery.eq('ta_id', user.id)
  ).select('id')

  if (deleteError) return { error: '답변 취소에 실패했습니다.' }
  if (!deleted || deleted.length === 0) return { error: '본인이 등록한 답변만 취소할 수 있습니다.' }

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

  const user = await getVerifiedUser()
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

// full 모드(최종 답까지 풀이)는 그래프를 직접 그릴 수 있어야 해서 이미지 생성 지원 모델을 쓴다.
// gemini-3.1-flash-image(Nano Banana 2)는 TEXT+IMAGE 동시 요청 시 응답이 끝없이 지연되는 현상이
// 실측으로 확인됐고(빈 프롬프트로도 90초+ 무응답), gemini-2.5-flash-image(Nano Banana)는 안정적으로
// 응답은 하지만 좌표/그래프 정확도가 낮아(점 위치 오류, 도형 왜곡, 이미지 안 한글 깨짐) 조교 검수 없이
// 학생에게 바로 나갈 수 있는 1차 초안 품질로는 부족했다. gemini-3-pro-image(Nano Banana Pro)로
// 실측 검증한 결과 좌표·라벨이 정확해 이걸 쓴다. 이미지 1장당 약 $0.134(1K/2K) —
// flash-image 대비 3~4배 비싸므로 월 지출 한도를 반드시 넉넉히 잡아둘 것.
const AI_DRAFT_IMAGE_MODEL = 'gemini-3-pro-image'

// generateAiDraft(조교가 수동으로 누르는 버튼)와 질문 등록 시 자동 1차 답변 생성이
// 같은 핵심 로직을 쓰되 호출 주체의 권한 체크만 다르므로, 실제 Gemini 호출부는
// 이 내부 함수로 분리해 공유한다. userId는 로그·업로드 경로 구성용.
async function runAiDraftGeneration(
  questionContent: string,
  imageUrls: string[],
  mode: AiDraftMode,
  userId: string,
): Promise<{ draft?: string; mediaUrls?: string[]; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'Gemini API 키가 설정되지 않았습니다.' }

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
- **풀이가 성격이 다른 여러 단계로 자연스럽게 나뉘는 문제(예: 길이부터 구한 뒤 그 값으로 좌표를 구하는 문제)라면 "**Step 1**", "**Step 2**"처럼 단계 제목을 붙여 구분할 것.** 공식 하나로 바로 끝나는 단일 단계 문제는 억지로 단계를 쪼개지 말고 번호 없이 쓸 것.
- **그래프/도형으로 나타낼 수 있는 문제(함수 그래프 개형, 도형·좌표 문제 등)라면 말로 설명하기 전에 반드시 그래프 이미지를 먼저 그려서 보여줄 것** — 좌표축, 눈금, 주요 점(교점·꼭짓점 등), 곡선/직선을 정확한 위치에 표시하고, 이미지 다음에 그 그래프를 근거로 한 짧은 설명을 덧붙일 것. 그래프가 필요없는 순수 계산 문제라면 이미지 없이 텍스트로만 풀이할 것.
- **이미지에는 좌표축·눈금·곡선/도형·좌표 라벨만 그릴 것.** 문제 지문, 식 전개 과정, "풀이:"/"최종 답" 같은 텍스트를 이미지 안에 다시 옮겨 적지 말 것 — 그런 서술은 전부 이미지 밖 본문에 쓴다. 이미지는 순수한 도형/그래프 삽화 하나로 충분하며, 같은 그래프를 두 장 이상 반복해서 그리지 말 것 (최대 1장).
- **이미지 안에는 한국어를 쓰지 말 것.** 이미지 생성 모델은 한글 렌더링이 깨지기 쉽다. 이미지에 라벨이 꼭 필요하면 숫자와 영어(알파벳, 좌표, 함수식 등)만 쓰고, 한국어 설명은 전부 이미지 밖의 텍스트로 뺄 것.
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
7. **반드시 대한민국 고등학교 수학 교육과정 범위 안의 개념·풀이 방법만 사용할 것.** 대학 과정 기법(예: 라플라스 변환, 다변수 미적분, 선형대수의 고급 정리, 교육과정 밖 급수·해석 기법 등)은 절대 쓰지 말 것. 교육과정 안에서 여러 풀이가 가능하면 그중 가장 표준적이고 짧은 방법을 택할 것.

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
          logger.warn('generateAiDraft:image-fetch-failed', { action: 'generateAiDraft', userId: userId, error: e })
        }
      }
    }

    contentsParts.push(
      imageUrls.length > 0
        ? `위 이미지가 학생이 첨부한 문제/풀이 사진이다.\n\n학생 질문: ${questionContent}`
        : `학생 질문: ${questionContent}`,
    )

    // full 모드는 그래프 이미지를 직접 그려야 하므로 이미지 생성이 가능한 모델을 쓴다.
    // hint 모드는 이미지가 필요 없어 텍스트 전용 flash를 그대로 유지.
    const model = mode === 'full' ? AI_DRAFT_IMAGE_MODEL : 'gemini-2.5-flash'

    const response = await ai.models.generateContent({
      model,
      contents: contentsParts,
      config: {
        systemInstruction,
        temperature: 0.3,
        ...(mode === 'full' ? { responseModalities: [Modality.TEXT, Modality.IMAGE] } : {}),
        // gemini-3-pro-image(full 모드)는 thinkingConfig 없이도 기본으로 사고하며, outputTokenLimit이
        // 32768이라 그 이상을 넣으면 400 에러가 난다 — hint 모드(gemini-2.5-flash)에서만 사고 예산을
        // 명시적으로 켠다. thinking 토큰도 maxOutputTokens에 포함되고 budget을 초과할 수 있어서,
        // 어려운 문제에서 한도가 작으면 MAX_TOKENS로 잘림 → 각 모델의 최대치로 연다.
        maxOutputTokens: mode === 'full' ? 32768 : 4096,
        ...(mode === 'full' ? {} : { thinkingConfig: { thinkingBudget: 1024 } }),
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
        const filePath = `ai-drafts/${userId}/${Date.now()}.${ext}`

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
        user_id: userId,
        feature: 'qna_draft',
        mode,
        model,
        prompt_tokens: usage?.promptTokenCount ?? 0,
        thoughts_tokens: usage?.thoughtsTokenCount ?? 0,
        output_tokens: usage?.candidatesTokenCount ?? 0,
      })
    } catch (e) {
      logger.warn('generateAiDraft:usage-log-failed', { action: 'generateAiDraft', userId: userId, error: e })
    }

    if (!rawText) return { error: 'AI 응답을 받지 못했습니다.' }

    // 토큰 한도로 풀이가 중간에 끊긴 초안은 그대로 쓰면 안 됨 — 재시도 유도
    const finishReason = String(response.candidates?.[0]?.finishReason ?? '')
    if (finishReason === 'MAX_TOKENS') {
      logger.warn('generateAiDraft:truncated', { action: 'generateAiDraft', userId: userId, input: rawText.slice(-200) })
      return { error: '풀이가 너무 길어 응답이 중간에 잘렸습니다. 다시 시도해 주세요.' }
    }

    logger.info('generateAiDraft:raw', { action: 'generateAiDraft', userId: userId, input: rawText.slice(0, 500) })

    // 모델이 관성으로 예전 형식의 태그를 붙여도 본문만 남긴다
    const draft = rawText.replace(/###[A-Z]+###/g, '').trim()
    if (!draft) return { error: 'AI 응답을 파싱할 수 없습니다. 다시 시도해 주세요.' }
    return { draft, mediaUrls }
  } catch (err: unknown) {
    logger.error('generateAiDraft:error', { action: 'generateAiDraft', userId: userId, error: err })
    
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

// 조교가 "AI 초안" 버튼을 눌러 수동으로 생성 — 권한 체크 후 핵심 로직에 위임.
export async function generateAiDraft(
  questionContent: string,
  imageUrls: string[] = [],
  mode: AiDraftMode = 'hint',
): Promise<{ draft?: string; mediaUrls?: string[]; error?: string }> {
  const user = await getVerifiedUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) return { error: '권한이 없습니다.' }

  return runAiDraftGeneration(questionContent, imageUrls, mode, user.id)
}

export async function createQuestion(data: {
  title: string
  content: string
  classId: string | null
  imageUrls: string[]
  textbookId?: string | null
  subjectId?: string | null
  problemNumber?: string | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getVerifiedUser()

  if (!user) return { error: '인증이 필요합니다.' }
  if (!data.classId) return { error: '분반을 선택해주세요.' }
  if (!data.textbookId) return { error: '교재를 선택해주세요.' }

  const { suspended } = await checkSuspension(user.id)
  if (suspended) return { error: '휴원 중에는 질문 등록이 제한됩니다.' }

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
      subject_id: data.subjectId || null,
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

  // 1차 답변 자동 준비 — 학생 응답을 기다리게 하면 안 되므로 응답 전송 후 백그라운드에서 실행.
  // 조교가 검토 전까지는 ta_id가 null인 미확정 상태로만 존재한다(AI 생성이든, 아래 유사 문항
  // 재활용이든 동일). 같은/비슷한 문항에 이미 답변이 있으면 AI를 호출하지 않고 그 답변을 그대로
  // 재사용해 비용을 아낀다 — 다만 실제로 다른 문항일 수 있어(특히 유사도 매칭) 학생이 "유사 문항이
  // 실제 문항과 다름"으로 피드백하며 추가 요청할 수 있게 해둔다.
  if (inserted?.id) {
    const questionId = inserted.id as string
    const questionContent = data.content
    const imageUrls = data.imageUrls
    const studentId = user.id
    const textbookId = data.textbookId ?? null
    const problemNumber = data.problemNumber ?? null
    const title = data.title

    after(async () => {
      const admin = createAdminClient()

      const related = await findRelatedAnswers({
        excludeQuestionId: questionId,
        textbookId,
        problemNumber,
        title,
        content: questionContent,
      })
      const bestMatch = related[0]

      if (bestMatch) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: linkError } = await (admin as any).from('qna_answers').insert({
          question_id: questionId,
          ta_id: null,
          content: bestMatch.content,
          media_urls: bestMatch.mediaUrls,
          is_ai_draft: false,
          adopted_from_question_id: bestMatch.questionId,
          difficulty: bestMatch.difficulty,
        })
        if (linkError) {
          logger.error('createQuestion:related-link-failed', { action: 'createQuestion', userId: studentId, error: linkError })
        } else {
          revalidatePath('/admin/qna')
          revalidatePath(`/admin/qna/${questionId}`)
          revalidatePath('/dashboard/qna')
          revalidatePath(`/dashboard/qna/${questionId}`)
        }
        return
      }

      const result = await runAiDraftGeneration(questionContent, imageUrls, 'full', studentId)
      if (result.error || !result.draft) {
        logger.warn('createQuestion:ai-draft-failed', { action: 'createQuestion', userId: studentId, error: result.error })
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: draftError } = await (admin as any).from('qna_answers').insert({
        question_id: questionId,
        ta_id: null,
        content: result.draft,
        media_urls: result.mediaUrls ?? [],
        is_ai_draft: true,
        difficulty: null,
      })
      if (draftError) {
        logger.error('createQuestion:ai-draft-save-failed', { action: 'createQuestion', userId: studentId, error: draftError })
        return
      }

      revalidatePath('/admin/qna')
      revalidatePath(`/admin/qna/${questionId}`)
      revalidatePath('/dashboard/qna')
      revalidatePath(`/dashboard/qna/${questionId}`)
    })
  }

  revalidatePath('/dashboard/qna')
  revalidatePath('/admin/qna')
  return {}
}

export async function deleteQuestion(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getVerifiedUser()

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
