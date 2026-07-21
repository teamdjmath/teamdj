'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'
import { logger } from '@/lib/logger'

export async function generateExamAnalysis(data: {
  studentName: string
  school: string
  studentGrade: string
  examName: string
  examType: string
  examDifficulty: string
  score: number
  maxScore: number
  examGrade: string | null
  rankInExam: number | null
  totalInExam: number | null
  estimatedGrade: string | null
  estimatedPercentile: number | null
}): Promise<{ draft?: string; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'Gemini API 키가 설정되지 않았습니다.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) return { error: '권한이 없습니다.' }

  try {
    const ai = new GoogleGenAI({ apiKey })

    const systemInstruction = `너는 수학 학원에서 오래 학생들을 지도해 온 선생님이다. 방금 채점한 시험 결과를 보고
학부모·학생에게 전달할 "선생님 분석" 코멘트를 쓴다.

문체 규칙 (엄수 — AI가 쓴 티가 나면 안 된다):
1. 반드시 존댓말(~습니다/~해요/~네요체)로 쓴다. 반말 종결어미(~다, ~자, ~았다)나 "OO아/OO야" 같은 반말 호칭 절대 금지 — 학부모도 읽는 글이다. 이름을 부를 땐 "OO 학생" 또는 "OO이"처럼 존대 어미와 어울리게.
   예시 시작 톤: "이번 시험에서는 ~했습니다.", "~부분에서 아쉬움이 있었어요." (이런 어미)
2. "[분석 결과]", "[학습 제안]" 같은 대괄호 소제목, 번호 매긴 리스트(1. 2. 3.)를 쓰지 말 것 — 자연스러운 문단 2~3개로 이어 쓴다.
3. 헤지 표현 금지 — 존댓말·반말 활용형을 모두 포함해 다음 계열의 표현을 절대 쓰지 말 것: "보이다"류(보입니다/보이네요/보인다/보여요), "판단되다"류, "파악되다/파악했다"류, "확인되다/확인할 수 있었다"류. 확신 있게 짧게 말한다.
4. "학생은 ~했습니다" 식으로 3인칭 관찰자처럼 쓰지 말고, 학생·학부모에게 직접 말을 건네듯 자연스럽게 쓴다.
5. 뻔한 격려 문구("힘내세요!", "화이팅!", 느낌표 남발) 금지. 담백하게 마무리한다.
6. 전체 3~5문장, 400자 이내. 짧고 실질적으로.
7. 숫자(점수·등수·등급)는 이미 레포트에 표로 나오니 다시 나열하지 말고, 그 숫자가 "무엇을 의미하는지"와 "다음에 뭘 해야 하는지"에 집중한다.
8. 시험 난이도/특이사항 메모가 주어지면 그 맥락(예: 학교 시험 특성, 이번 회차 난이도)을 자연스럽게 녹여서 분석에 반영한다 — 단, 메모에 없는 내용을 지어내지 말 것.

출력 직전, 3번 금지 표현("보이다/판단되다/파악되다/확인되다" 계열)이 문장에 남아있는지 스스로 다시 확인하고, 있으면 반드시 다른 표현으로 고쳐 쓸 것.

출력 형식: 다른 설명 없이 선생님 코멘트 본문만 출력한다.`

    const facts = [
      `학생: ${data.studentName}${data.school ? ` (${data.school}${data.studentGrade ? ` ${data.studentGrade}학년` : ''})` : ''}`,
      `시험: ${data.examName} (${data.examType})`,
      data.examDifficulty ? `시험 난이도/특이사항 메모: ${data.examDifficulty}` : null,
      `점수: ${data.score} / ${data.maxScore}점`,
      data.examGrade ? `학원 내 등급: ${data.examGrade}` : null,
      data.rankInExam != null ? `학원 내 등수: ${data.rankInExam}/${data.totalInExam ?? '?'}등` : null,
      data.estimatedGrade
        ? `예측 등급(학원 내 응시자 분포 기반 통계 추정): ${data.estimatedGrade}${data.estimatedPercentile != null ? ` (상위 ${data.estimatedPercentile}%)` : ''}`
        : null,
    ].filter(Boolean).join('\n')

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [`다음 시험 결과를 보고 선생님 분석 코멘트를 작성해줘.\n\n${facts}`],
      config: {
        systemInstruction,
        temperature: 0.6,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 512 },
      },
    })

    const text = response.text?.trim()
    if (!text) return { error: 'AI 응답이 비어 있습니다. 다시 시도해주세요.' }
    return { draft: text }
  } catch (err) {
    logger.warn('generateExamAnalysis:failed', { action: 'generateExamAnalysis', userId: user.id, error: err })
    return { error: 'AI 분석 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' }
  }
}
