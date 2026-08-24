import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { findRelatedAnswers, getDifficultyHint } from '@/lib/data/qna-related'
import { translateAiFailureReason, QNA_FEEDBACK_CATEGORY_LABEL } from '@/lib/qna-status'
import { QnaDetailClient } from './_components/qna-detail-client'

export default async function QnaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ queue?: string }>
}) {
  const { id } = await params
  const { queue } = await searchParams
  const queueMode = queue === '1'
  const supabase = await createClient()

  const user = await getVerifiedUser()
  if (!user) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: q } = await (supabase as any)
    .from('qna_questions')
    .select(
      'id, title, content, image_urls, status, assigned_ta_id, created_at, problem_number, textbook_id, additional_requested_at, student:users!student_id(name), class:class_groups!class_id(name), assigned_ta:users!assigned_ta_id(name), textbook:textbooks!textbook_id(name), subject:subjects!subject_id(name)',
    )
    .eq('id', id)
    .single()

  if (!q) notFound()

  const r = q as Record<string, unknown>
  const question = {
    id: r.id as string,
    title: (r.title as string) ?? '',
    content: r.content as string,
    image_urls: (r.image_urls as string[]) ?? [],
    status: r.status as 'open' | 'in_progress' | 'answered',
    assigned_ta_id: (r.assigned_ta_id ?? null) as string | null,
    created_at: r.created_at as string,
    studentName: ((r.student as { name?: string } | null)?.name ?? '') as string,
    className: ((r.class as { name?: string } | null)?.name ?? null) as string | null,
    assignedTaName: ((r.assigned_ta as { name?: string } | null)?.name ?? null) as string | null,
    textbookName: ((r.textbook as { name?: string } | null)?.name ?? null) as string | null,
    subjectName: ((r.subject as { name?: string } | null)?.name ?? null) as string | null,
    problemNumber: (r.problem_number ?? null) as string | null,
    additionalRequestedAt: (r.additional_requested_at ?? null) as string | null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: answerRows } = await (supabase as any)
    .from('qna_answers')
    .select('id, content, media_urls, answered_at, ta_id, is_ai_draft, adopted_from_question_id, difficulty, student_rating, ta:users!ta_id(name, role, is_super_admin)')
    .eq('question_id', id)
    .order('answered_at', { ascending: true })

  // 조교가 아직 확정 안 한 미확정 답변(ta_id=null)은 미답변/답변중일 때만 "답변 기록"과 분리해
  // 별도 카드로 보여준다. AI 생성이든 유사 문항 자동 연결이든 조교 미검토라는 점은 같다.
  // 이미 답변완료(학생 자체 확정 포함)라면 그 답변이 곧 최종 기록이므로 평범한 답변 기록에
  // 그대로 포함시킨다.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allAnswerRows = (answerRows ?? []) as any[]
  const pendingAiDraftRow = question.status !== 'answered'
    ? allAnswerRows.find((ar) => !ar.ta_id)
    : undefined
  const aiDraft = pendingAiDraftRow
    ? {
        id: pendingAiDraftRow.id as string,
        content: pendingAiDraftRow.content as string,
        mediaUrls: (pendingAiDraftRow.media_urls as string[]) ?? [],
        isAiDraft: (pendingAiDraftRow.is_ai_draft as boolean | null) ?? false,
      }
    : null

  const answers = allAnswerRows
    .filter((ar) => ar.id !== pendingAiDraftRow?.id)
    .map((ar: Record<string, unknown>) => ({
      id: ar.id as string,
      content: ar.content as string,
      media_urls: (ar.media_urls as string[]) ?? [],
      answered_at: ar.answered_at as string,
      taId: (ar.ta_id as string) ?? '',
      taName: ar.ta_id
        ? (((ar.ta as { name?: string } | null)?.name ?? '') as string)
        : (ar.is_ai_draft ? 'AI (학생 확정)' : '이전 답변 연결 (학생 확정)'),
      taRole: ((ar.ta as { role?: string } | null)?.role ?? undefined) as string | undefined,
      taIsSuperAdmin: ((ar.ta as { is_super_admin?: boolean } | null)?.is_super_admin ?? false) as boolean,
      isAiDraft: (ar.is_ai_draft as boolean | null) ?? false,
      difficulty: (ar.difficulty as number | null) ?? null,
      studentRating: (ar.student_rating as number | null) ?? null,
    }))

  // AI 1차 답변 생성이 실패했으면 학생 눈에는 그냥 "아직 무응답"으로만 보여서 조교가 실패
  // 사실 자체를 알 방법이 없었다 — 이 질문에 남은 error_logs를 조회해 조교 화면에만 사유를 보여준다.
  // 초안이 이미 붙어 있거나(성공) 이미 답변완료면 과거 실패 이력은 더 이상 의미가 없어 조회하지 않는다.
  let aiFailure: { reason: string; message: string; createdAt: string } | null = null
  if (!aiDraft && question.status !== 'answered') {
    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: errorRow } = await (admin as any)
      .from('error_logs')
      .select('message, created_at')
      .filter('context->>questionId', 'eq', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (errorRow) {
      const message = errorRow.message as string
      aiFailure = { reason: translateAiFailureReason(message), message, createdAt: errorRow.created_at as string }
    }
  }

  // 추가 답변을 요청하며 학생이 남긴 사유 — 조교가 뭘 고쳐야 할지 모른 채로 다시 쓰지 않게
  // "추가 답변 작성" 칸 위에 보여준다. 요청이 여러 번 있었어도 지금 대기 중인 가장 최근 것만.
  let requestReason: { categoryLabel: string; detail: string | null; createdAt: string } | null = null
  if (question.additionalRequestedAt) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: feedbackRow } = await (supabase as any)
      .from('qna_ai_feedback')
      .select('category, detail, created_at')
      .eq('question_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (feedbackRow) {
      requestReason = {
        categoryLabel: QNA_FEEDBACK_CATEGORY_LABEL[feedbackRow.category as string] ?? feedbackRow.category,
        detail: (feedbackRow.detail as string | null) ?? null,
        createdAt: feedbackRow.created_at as string,
      }
    }
  }

  const currentUserName = (user.user_metadata?.name as string | undefined) ?? ''
  const currentUserRole = (user.user_metadata?.role as string | undefined) ?? ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: currentUserRow } = await (supabase as any).from('users').select('is_super_admin').eq('id', user.id).maybeSingle()
  const currentUserIsSuperAdmin = (currentUserRow?.is_super_admin as boolean | null) ?? false

  // 유사 문항(같은 교재+문항)의 기존 답변 자동 연결 + 추천 난이도 근거 —
  // 이미 답변된 질문은 답변 작성 UI 자체가 숨겨지므로 조회할 필요가 없다
  const textbookId = (r.textbook_id ?? null) as string | null
  const [relatedAnswers, difficultyHint] = question.status === 'answered'
    ? [[], { textbookAvg: null, count: 0 }]
    : await Promise.all([
        findRelatedAnswers({
          excludeQuestionId: id,
          textbookId,
          problemNumber: question.problemNumber,
          title: question.title,
          content: question.content,
        }),
        getDifficultyHint(textbookId),
      ])

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/qna"
          className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
          질의응답 목록
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">{question.title || '질문 상세'}</h1>
          <span className="text-sm text-zinc-400 dark:text-zinc-600">·</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-500">{question.studentName}</span>
          {question.className && <span className="rounded-full bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-400">{question.className}</span>}
          {question.subjectName && <span className="rounded-full bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-400">{question.subjectName}</span>}
          {question.textbookName && (
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              {question.textbookName}{question.problemNumber ? ` · ${question.problemNumber}` : ''}
            </span>
          )}
          {!question.textbookName && question.problemNumber && (
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-400">{question.problemNumber}</span>
          )}
        </div>
      </div>

      <QnaDetailClient
        question={question}
        answers={answers}
        aiDraft={aiDraft}
        aiFailure={aiFailure}
        requestReason={requestReason}
        queueMode={queueMode}
        currentUserId={user.id}
        currentUserName={currentUserName}
        currentUserRole={currentUserRole}
        currentUserIsSuperAdmin={currentUserIsSuperAdmin}
        relatedAnswers={relatedAnswers}
        difficultyHint={difficultyHint}
      />
    </div>
  )
}
