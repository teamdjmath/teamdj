import { createClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { findRelatedAnswers, getDifficultyHint } from '@/lib/data/qna-related'
import { QnaDetailClient } from './_components/qna-detail-client'

export default async function QnaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const user = await getVerifiedUser()
  if (!user) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: q } = await (supabase as any)
    .from('qna_questions')
    .select(
      'id, title, content, image_urls, status, assigned_ta_id, created_at, problem_number, textbook_id, additional_requested_at, student:users!student_id(name), class:class_groups!class_id(name), assigned_ta:users!assigned_ta_id(name), textbook:textbooks!textbook_id(name)',
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
    problemNumber: (r.problem_number ?? null) as string | null,
    additionalRequestedAt: (r.additional_requested_at ?? null) as string | null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: answerRows } = await (supabase as any)
    .from('qna_answers')
    .select('id, content, media_urls, answered_at, ta_id, is_ai_draft, adopted_from_question_id, difficulty, student_rating, ta:users!ta_id(name)')
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
      isAiDraft: (ar.is_ai_draft as boolean | null) ?? false,
      difficulty: (ar.difficulty as number | null) ?? null,
      studentRating: (ar.student_rating as number | null) ?? null,
    }))

  const currentUserName = (user.user_metadata?.name as string | undefined) ?? ''
  const currentUserRole = (user.user_metadata?.role as string | undefined) ?? ''

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
        currentUserId={user.id}
        currentUserName={currentUserName}
        currentUserRole={currentUserRole}
        relatedAnswers={relatedAnswers}
        difficultyHint={difficultyHint}
      />
    </div>
  )
}
