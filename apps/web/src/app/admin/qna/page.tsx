import { createClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { getVisibleClassOptions } from '@/lib/data/class-options'
import { QnaClient } from './_components/qna-client'

export default async function QnaPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    classId?: string
    textbookId?: string
    problemNumber?: string
    taId?: string
  }>
}) {
  const {
    status: selectedStatus,
    classId: selectedClassId,
    textbookId: selectedTextbookId,
    problemNumber: selectedProblemNumber,
    taId: selectedTaId,
  } = await searchParams

  const supabase = await createClient()
  const user = await getVerifiedUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [classes, textbooksRes, taListRes] = await Promise.all([
    getVisibleClassOptions(),
    db.from('textbooks').select('id, name').order('name'),
    supabase
      .from('users')
      .select('id, name, role')
      .in('role', ['teacher', 'ta_desk', 'ta_assistant'])
      .eq('is_active', true)
      .order('name'),
  ])

  // textbook_id/problem_number/textbooks join available after migration - using any cast
  let query = db
    .from('qna_questions')
    .select(
      'id, title, content, status, created_at, assigned_ta_id, textbook_id, problem_number, additional_requested_at, student:users!student_id(name), class:class_groups!class_id(name), assigned_ta:users!assigned_ta_id(name), textbook:textbooks!textbook_id(name)',
    )
    .order('created_at', { ascending: false })

  // "AI 초안 대기"는 실제 status 값이 아니라 open 중 조교 미검토 초안이 붙은 것만 골라내는
  // 파생 필터라, DB엔 항상 status='open'으로 걸고 아래에서 hasAiDraft로 한 번 더 걸러낸다.
  if (selectedStatus === 'ai_draft') {
    query = query.eq('status', 'open')
  } else if (selectedStatus && selectedStatus !== 'all') {
    query = query.eq('status', selectedStatus)
  }
  if (selectedClassId) {
    query = query.eq('class_id', selectedClassId)
  }
  if (selectedTextbookId) {
    query = query.eq('textbook_id', selectedTextbookId)
  }
  if (selectedProblemNumber) {
    query = query.ilike('problem_number', `%${selectedProblemNumber}%`)
  }
  if (selectedTaId) {
    query = query.eq('assigned_ta_id', selectedTaId)
  }

  // 분반/교재/문항/담당조교 필터를 그대로 적용하는 공통 헬퍼 — status 카운트와 AI초안 카운트가 공유
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyCommonFilters(q: any) {
    if (selectedClassId)      q = q.eq('class_id', selectedClassId)
    if (selectedTextbookId)   q = q.eq('textbook_id', selectedTextbookId)
    if (selectedProblemNumber) q = q.ilike('problem_number', `%${selectedProblemNumber}%`)
    if (selectedTaId)         q = q.eq('assigned_ta_id', selectedTaId)
    return q
  }

  // 상태별 카운트 — status 필터와 무관하게 별도 집계 (다른 필터는 동일 적용)
  // 미답변 토글 중에도 답변중/답변완료 개수가 유지되도록 head-count 쿼리로 계산
  function countQuery(status: string) {
    return applyCommonFilters(db.from('qna_questions').select('id', { count: 'exact', head: true }).eq('status', status))
  }

  const [{ data: rows }, openCnt, progressCnt, answeredCnt, { data: aiDraftRows }, { data: filteredOpenRows }] = await Promise.all([
    query,
    countQuery('open'),
    countQuery('in_progress'),
    countQuery('answered'),
    // 조교가 아직 확정 안 한 답변(AI 생성 또는 유사 문항 자동 연결)이 붙어있는 질문 id 목록 —
    // 목록에 AI 뱃지 표시용
    db.from('qna_answers').select('question_id').is('ta_id', null),
    // "AI 초안 대기" 탭 카운트용 — 다른 필터(분반/교재/문항/담당조교)는 그대로 적용된 open 질문 id
    applyCommonFilters(db.from('qna_questions').select('id').eq('status', 'open')),
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiDraftQuestionIds = new Set((aiDraftRows ?? []).map((a: any) => a.question_id as string))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiDraftCount = ((filteredOpenRows ?? []) as any[]).filter((r) => aiDraftQuestionIds.has(r.id as string)).length

  const statusCounts = {
    open:        openCnt.count ?? 0,
    in_progress: progressCnt.count ?? 0,
    answered:    answeredCnt.count ?? 0,
    ai_draft:    aiDraftCount,
    all:         (openCnt.count ?? 0) + (progressCnt.count ?? 0) + (answeredCnt.count ?? 0),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questions = (rows ?? []).map((q: any) => {
    const r = q as Record<string, unknown>
    return {
      id: r.id as string,
      title: (r.title as string | null) ?? '',
      content: (r.content as string).slice(0, 80),
      status: r.status as 'open' | 'in_progress' | 'answered',
      created_at: r.created_at as string,
      assigned_ta_id: (r.assigned_ta_id ?? null) as string | null,
      textbook_id: (r.textbook_id ?? null) as string | null,
      problem_number: (r.problem_number ?? null) as string | null,
      studentName: ((r.student as { name?: string } | null)?.name ?? '') as string,
      className: ((r.class as { name?: string } | null)?.name ?? null) as string | null,
      assignedTaName: ((r.assigned_ta as { name?: string } | null)?.name ?? null) as string | null,
      textbookName: ((r.textbook as { name?: string } | null)?.name ?? null) as string | null,
      additionalRequestedAt: (r.additional_requested_at ?? null) as string | null,
      hasAiDraft: aiDraftQuestionIds.has(r.id as string),
    }
  }).filter((q: { hasAiDraft: boolean }) => selectedStatus !== 'ai_draft' || q.hasAiDraft)

  // 같은 교재+문항 중복 질문 식별
  const dupKey = (q: (typeof questions)[number]) =>
    q.textbook_id && q.problem_number ? `${q.textbook_id}::${q.problem_number}` : null
  const keyCounts = new Map<string, number>()
  for (const q of questions) {
    const k = dupKey(q)
    if (k) keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1)
  }
  const isDuplicate = (q: (typeof questions)[number]) => {
    const k = dupKey(q)
    return k ? (keyCounts.get(k) ?? 0) >= 2 : false
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questionsWithDup = questions.map((q: any) => ({ ...q, isDuplicate: isDuplicate(q) }))

  // 내 답변 통계 (ta_id = 현재 유저)
  let myStats = null
  if (user) {
    const { data: myAnswers } = await db
      .from('qna_answers')
      .select('difficulty, created_at, student_rating')
      .eq('ta_id', user.id)

    if (myAnswers && myAnswers.length > 0) {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rated = myAnswers.filter((a: any) => a.student_rating != null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const avgRating = rated.length > 0
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? rated.reduce((sum: number, a: any) => sum + (a.student_rating as number), 0) / rated.length
        : null
      myStats = {
        total: myAnswers.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        monthly: myAnswers.filter((a: any) => a.created_at >= monthStart).length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        low: myAnswers.filter((a: any) => a.difficulty >= 1 && a.difficulty <= 4).length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mid: myAnswers.filter((a: any) => a.difficulty >= 5 && a.difficulty <= 6).length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        high: myAnswers.filter((a: any) => a.difficulty >= 7 && a.difficulty <= 8).length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        unset: myAnswers.filter((a: any) => a.difficulty === null || a.difficulty === undefined).length,
        avgRating,
        ratedCount: rated.length,
      }
    }
  }

  return (
    <QnaClient
      classOptions={classes.map((c) => ({ id: c.id, name: c.name }))}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      textbookOptions={(textbooksRes.data ?? []).map((t: any) => ({ id: t.id as string, name: t.name as string }))}
      taOptions={(taListRes.data ?? []).map((t) => ({ id: t.id, name: t.name as string, role: t.role as string }))}
      selectedStatus={selectedStatus ?? 'all'}
      selectedClassId={selectedClassId ?? null}
      selectedTextbookId={selectedTextbookId ?? null}
      selectedProblemNumber={selectedProblemNumber ?? ''}
      selectedTaId={selectedTaId ?? null}
      questions={questionsWithDup}
      statusCounts={statusCounts}
      myStats={myStats}
      currentUserId={user?.id ?? null}
    />
  )
}
