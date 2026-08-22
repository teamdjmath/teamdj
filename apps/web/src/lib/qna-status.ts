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
