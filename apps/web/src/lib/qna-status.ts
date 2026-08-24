// 질의응답 상태 라벨 — admin/학생 화면 여러 곳에서 동일한 문구를 써야 한다 (기존에 7개 파일에
// 복붙돼 있던 것을 하나로 모음). 배지 색상은 화면마다 디자인이 달라 그대로 각자 유지한다.
export const QNA_STATUS_LABEL: Record<string, string> = {
  open: '미답변',
  in_progress: '답변중',
  answered: '답변완료',
}

export type QnaAttentionCounts = {
  trueUnanswered: number // AI 초안조차 없는, 아무도 안 건드린 질문 — 가장 급함
  aiDraftPending: number // AI 초안은 붙었으나 조교 미검토 — 정상 워크플로우, 급하지 않음
  additionalRequested: number // 학생이 추가 답변을 요청한 질문 — 급함
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryableClient = { from: (table: string) => any }

// 관리자 홈 대시보드의 "미답변" 카드 등에서 쓰는 3버킷 집계.
// status='open'인 질문 중 AI 초안(ta_id null인 qna_answers) 존재 여부로 한 번 더 쪼갠다.
export async function getQnaAttentionCounts(supabase: QueryableClient): Promise<QnaAttentionCounts> {
  const { data: rows } = await supabase
    .from('qna_questions')
    .select('id, status, additional_requested_at')
    .in('status', ['open', 'in_progress'])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questionRows = (rows ?? []) as any[]
  const openIds = questionRows.filter((r) => r.status === 'open').map((r) => r.id as string)
  const additionalRequested = questionRows.filter((r) => r.status === 'in_progress' && r.additional_requested_at).length

  let aiDraftPending = 0
  if (openIds.length > 0) {
    const { data: drafts } = await supabase
      .from('qna_answers')
      .select('question_id')
      .is('ta_id', null)
      .in('question_id', openIds)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    aiDraftPending = new Set(((drafts ?? []) as any[]).map((d) => d.question_id as string)).size
  }

  return {
    trueUnanswered: openIds.length - aiDraftPending,
    aiDraftPending,
    additionalRequested,
  }
}

// AI 초안 순차 검토 — 가장 오래 기다린(생성일 오름차순) 미검토 AI 초안 질문 id 하나만 뽑는다.
// 조교가 "AI 초안 대기" 탭에서 한 건 확인/제출하면 다시 이 함수를 호출해 다음 건으로 넘어간다.
export async function getOldestAiDraftQuestionId(supabase: QueryableClient): Promise<string | null> {
  const { data: openRows } = await supabase
    .from('qna_questions')
    .select('id, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (openRows ?? []) as any[]
  if (rows.length === 0) return null
  const ids = rows.map((r) => r.id as string)

  const { data: drafts } = await supabase
    .from('qna_answers')
    .select('question_id')
    .is('ta_id', null)
    .in('question_id', ids)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const draftIds = new Set(((drafts ?? []) as any[]).map((d) => d.question_id as string))

  const oldest = rows.find((r) => draftIds.has(r.id as string))
  return (oldest?.id as string | undefined) ?? null
}

// 학생이 추가 답변을 요청할 때 고르는 사유 — 답변 통계(모니터링)와 조교 답변 화면(요청 사유
// 표시) 둘 다에서 쓰므로 한 곳에 모아둔다.
export const QNA_FEEDBACK_CATEGORY_LABEL: Record<string, string> = {
  wrong_answer: '정답을 출력하지 못함',
  unclear_explanation: '풀이과정 설명이 부족함',
  mismatched_problem: '유사 문항이 실제 문항과 다름',
  other: '기타(직접 서술)',
}

// error_logs에 남는 원문 메시지는 프로그래밍 배경이 없으면 못 알아본다 — 조교 화면에는
// 원인 종류만 짧게 번역해서 보여준다 (원문은 그 아래에 작게 참고용으로 같이 노출).
export function translateAiFailureReason(message: string): string {
  if (message.includes('저장 실패')) return '답변 저장 실패'
  if (/image|이미지|mime/i.test(message)) return '이미지 인식 실패'
  return '문제 풀이 실패'
}
