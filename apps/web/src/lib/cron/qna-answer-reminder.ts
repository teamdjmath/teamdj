import { createAdminClient } from '@/lib/supabase/admin'
import { sendKakaoText } from '@/lib/kakao'
import { logger } from '@/lib/logger'

// "조교님께 추가 답변 요청하기"를 누르고 20시간이 지나도록 아직 답변완료가 안 된 질문을
// 선생님께 카카오로 리마인드 — 24시간 약속(공지에 안내한 SLA)을 지키기 위한 사전 경고.
// 매시 정각 vercel.json cron이 호출. reminder_sent_at으로 같은 건을 중복 발송하지 않는다.
export async function runQnaAnswerReminder(): Promise<{ remindedCount: number }> {
  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: overdueQuestions } = await (admin as any)
    .from('qna_questions')
    .select('id, title, additional_requested_at')
    .neq('status', 'answered')
    .not('additional_requested_at', 'is', null)
    .is('reminder_sent_at', null)
    .lte('additional_requested_at', cutoff)

  if (!overdueQuestions || overdueQuestions.length === 0) return { remindedCount: 0 }

  const { data: teachers } = await admin
    .from('users')
    .select('phone')
    .eq('role', 'teacher')
    .eq('is_active', true)

  if (!teachers || teachers.length === 0) return { remindedCount: 0 }

  const phones = teachers.map((t) => t.phone as string | null)
  let remindedCount = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const q of overdueQuestions as any[]) {
    const text = `[TeamDJ] 답변 지연 경고\n"${q.title}" 질문이 추가 답변 요청 후 20시간이 지났습니다. 24시간 이내 답변 확인 부탁드립니다.`
    try {
      await sendKakaoText(phones, text, 'qnaAnswerReminder')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from('qna_questions').update({ reminder_sent_at: new Date().toISOString() }).eq('id', q.id)
      remindedCount++
    } catch (err) {
      logger.warn('qnaAnswerReminder:send-failed', { action: 'qnaAnswerReminder', userId: q.id, error: err })
    }
  }

  return { remindedCount }
}
