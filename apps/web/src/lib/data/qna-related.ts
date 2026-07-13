import { createAdminClient } from '@/lib/supabase/admin'

// 유사 문항의 기존 답변 자동 연결.
// 1순위: 같은 교재 + 같은 문항번호 (확실한 매칭)
// 2순위: 제목·내용 토큰 유사도 (교재/문항 정보가 없거나 다를 때의 보조 매칭)
// 별도 컬럼 없이 조회 시점에 찾으므로 과거 질문에도 소급 적용된다.
export type RelatedAnswer = {
  questionId: string
  questionTitle: string
  content: string
  mediaUrls: string[]
  taName: string
  difficulty: number | null
  answeredAt: string
  matchType: 'same_problem' | 'similar'
}

// 질문 글에서 의미 없는 상투어 — 유사도 계산에서 제외
const STOPWORDS = new Set([
  '질문', '질문이요', '질문입니다', '문제', '문항', '궁금합니다', '궁금해요',
  '주세요', '부탁드립니다', '설명', '관련', '대해', '어떻게', '모르겠어요',
  '모르겠습니다', '알려주세요', '해설', '풀이', '이해가', '있는데', '하는데',
])

export function extractTokens(text: string): string[] {
  const raw = text.toLowerCase().match(/[가-힣a-z0-9]{2,}/g) ?? []
  return [...new Set(raw.filter((t) => !STOPWORDS.has(t) && !/^\d+$/.test(t)))]
}

// 한국어 조사 대응: 완전 일치 외에 접두 관계도 매칭 ('이차함수' ↔ '이차함수의', '구간' ↔ '구간에서')
function tokenOverlap(a: string[], b: string[]): number {
  let count = 0
  for (const ta of a) {
    if (b.some((tb) => ta === tb || tb.startsWith(ta) || ta.startsWith(tb))) count++
  }
  return count
}

// 두 질문 글(제목+내용)의 유사 여부 판단. E2E 없이도 단위 테스트로 검증 가능하도록 순수 함수로 분리.
export function similarityScore(queryText: string, candidateText: string): { overlap: number; ratio: number; isSimilar: boolean } {
  const qt = extractTokens(queryText)
  const ct = extractTokens(candidateText)
  if (qt.length < 2 || ct.length === 0) return { overlap: 0, ratio: 0, isSimilar: false }
  const overlap = tokenOverlap(qt, ct)
  const ratio = overlap / Math.min(qt.length, ct.length)
  // 핵심 용어 3개 이상 겹치면서 짧은 쪽 기준 25% 이상, 또는 글이 짧아도 60% 이상 겹칠 때
  const isSimilar = (overlap >= 3 && ratio >= 0.25) || (overlap >= 2 && ratio >= 0.6)
  return { overlap, ratio, isSimilar }
}

const MAX_RELATED = 5

// 후보 질문들의 최신 답변을 한 번에 조회해 RelatedAnswer 목록으로 변환 (입력 순서 유지)
async function withLatestAnswers(
  questions: { id: string; title: string; matchType: RelatedAnswer['matchType'] }[],
): Promise<RelatedAnswer[]> {
  if (questions.length === 0) return []
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: answers } = await (admin as any)
    .from('qna_answers')
    .select('question_id, content, media_urls, difficulty, answered_at, ta:users!ta_id(name)')
    .in('question_id', questions.map((q) => q.id))
    .order('answered_at', { ascending: false })

  // 최신순 정렬이므로 질문별 첫 등장이 최신 답변
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestByQuestion = new Map<string, any>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const a of ((answers ?? []) as any[])) {
    if (!latestByQuestion.has(a.question_id as string)) latestByQuestion.set(a.question_id as string, a)
  }

  const result: RelatedAnswer[] = []
  for (const q of questions) {
    const answer = latestByQuestion.get(q.id)
    if (!answer) continue
    result.push({
      questionId: q.id,
      questionTitle: q.title,
      content: answer.content as string,
      mediaUrls: (answer.media_urls as string[]) ?? [],
      taName: (answer.ta?.name ?? 'TA') as string,
      difficulty: (answer.difficulty ?? null) as number | null,
      answeredAt: answer.answered_at as string,
      matchType: q.matchType,
    })
  }
  return result
}

// 유사 문항의 기존 답변 후보 목록 (같은 교재·문항 우선, 이어서 유사도순 — 최대 5건).
// 채택은 조교가 목록에서 하나씩 확인한 뒤 결정한다.
export async function findRelatedAnswers(params: {
  excludeQuestionId: string
  textbookId: string | null
  problemNumber: string | null
  title?: string | null
  content?: string | null
}): Promise<RelatedAnswer[]> {
  const { excludeQuestionId, textbookId, problemNumber, title, content } = params
  const admin = createAdminClient()

  const picked: { id: string; title: string; matchType: RelatedAnswer['matchType'] }[] = []

  // 1순위: 같은 교재+문항의 답변 완료된 다른 질문들 (최신순)
  if (textbookId && problemNumber?.trim()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: exact } = await (admin as any)
      .from('qna_questions')
      .select('id, title')
      .eq('textbook_id', textbookId)
      .eq('problem_number', problemNumber.trim())
      .eq('status', 'answered')
      .neq('id', excludeQuestionId)
      .order('created_at', { ascending: false })
      .limit(MAX_RELATED)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of ((exact ?? []) as any[])) {
      picked.push({ id: r.id as string, title: (r.title ?? '') as string, matchType: 'same_problem' })
    }
  }

  // 2순위: 제목·내용 토큰 유사도 (남은 자리만 채움)
  const queryText = `${title ?? ''} ${content ?? ''}`
  const queryTokens = extractTokens(queryText)
  if (picked.length < MAX_RELATED && queryTokens.length >= 2) {
    // 후보 선별은 DB(pg_trgm KNN)에서 전체 이력 대상으로 상위 20건만 —
    // 최종 유사 판정은 앱의 similarityScore가 수행 (상투어 제거 + 조사 대응)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let candidates: any[] | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (admin as any).rpc('find_similar_qna_candidates', {
      p_query: queryText,
      p_exclude_id: excludeQuestionId,
      p_limit: 20,
    })

    if (!rpcError) {
      candidates = rpcData
    } else {
      // 065 마이그레이션 미적용 환경 대비: 최근 300건 앱 비교로 폴백
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: legacy } = await (admin as any)
        .from('qna_questions')
        .select('id, title, content, created_at')
        .eq('status', 'answered')
        .neq('id', excludeQuestionId)
        .order('created_at', { ascending: false })
        .limit(300)
      candidates = legacy
    }

    const seen = new Set(picked.map((p) => p.id))
    const scored: { id: string; title: string; overlap: number; ratio: number }[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const c of ((candidates ?? []) as any[])) {
      if (seen.has(c.id as string)) continue
      const { overlap, ratio, isSimilar } = similarityScore(queryText, `${c.title ?? ''} ${c.content ?? ''}`)
      if (!isSimilar) continue
      scored.push({ id: c.id as string, title: (c.title ?? '') as string, overlap, ratio })
    }
    scored.sort((a, b) => (b.overlap - a.overlap) || (b.ratio - a.ratio))
    for (const s of scored.slice(0, MAX_RELATED - picked.length)) {
      picked.push({ id: s.id, title: s.title, matchType: 'similar' })
    }
  }

  return withLatestAnswers(picked)
}

// 추천 난이도 근거 — 같은 교재로 등록된 답변들의 난이도 평균
export type DifficultyHint = {
  textbookAvg: number | null
  count: number
}

export async function getDifficultyHint(textbookId: string | null): Promise<DifficultyHint> {
  if (!textbookId) return { textbookAvg: null, count: 0 }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('qna_answers')
    .select('difficulty, question:qna_questions!question_id(textbook_id)')
    .not('difficulty', 'is', null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values = ((data ?? []) as any[])
    .filter((r) => r.question?.textbook_id === textbookId)
    .map((r) => r.difficulty as number)

  if (values.length === 0) return { textbookAvg: null, count: 0 }
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  return { textbookAvg: Math.round(avg * 10) / 10, count: values.length }
}
