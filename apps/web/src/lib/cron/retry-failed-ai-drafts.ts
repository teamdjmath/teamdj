import { createAdminClient } from '@/lib/supabase/admin'
import { retryAiDraftForQuestion } from '@/lib/actions/qna'

// AI 1차 답변 생성이 일시적 오류(모델 과부하 등)로 실패해 답변이 하나도 안 붙은 open 질문을
// 주기적으로 다시 시도한다. 이미 오래된 건까지 계속 재시도하면 그 사이 조교가 수동으로
// 답변했을 가능성이 높고 비용만 나가므로, 최근에 등록된 것만 대상으로 한다 — 그 안에서
// 여러 번의 재시도 기회가 생기므로 몇 시간 내 일시적 장애는 대부분 회복된다.
const RETRY_WINDOW_MS = 24 * 60 * 60 * 1000

export async function runRetryFailedAiDrafts(): Promise<{ retriedCount: number }> {
  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - RETRY_WINDOW_MS).toISOString()

  const { data: openQuestions } = await admin
    .from('qna_questions')
    .select('id')
    .eq('status', 'open')
    .gte('created_at', cutoff)

  if (!openQuestions || openQuestions.length === 0) return { retriedCount: 0 }

  const ids = openQuestions.map((q) => q.id as string)
  const { data: answeredRows } = await admin.from('qna_answers').select('question_id').in('question_id', ids)
  const hasAnswer = new Set((answeredRows ?? []).map((a) => a.question_id as string))
  const candidates = ids.filter((id) => !hasAnswer.has(id))

  let retriedCount = 0
  for (const id of candidates) {
    const { attempted } = await retryAiDraftForQuestion(id)
    if (attempted) retriedCount++
  }

  return { retriedCount }
}
