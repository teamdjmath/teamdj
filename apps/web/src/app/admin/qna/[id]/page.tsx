import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { QnaDetailClient } from './_components/qna-detail-client'

export default async function QnaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: q } = await supabase
    .from('qna_questions')
    .select(
      'id, title, content, image_urls, status, assigned_ta_id, created_at, student:users!student_id(name), class:class_groups!class_id(name), assigned_ta:users!assigned_ta_id(name)',
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
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: answerRows } = await (supabase as any)
    .from('qna_answers')
    .select('id, content, media_urls, answered_at, ta_id, difficulty, ta:users!ta_id(name)')
    .eq('question_id', id)
    .order('answered_at', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const answers = ((answerRows ?? []) as any[]).map((ar: Record<string, unknown>) => ({
    id: ar.id as string,
    content: ar.content as string,
    media_urls: (ar.media_urls as string[]) ?? [],
    answered_at: ar.answered_at as string,
    taId: (ar.ta_id as string) ?? '',
    taName: ((ar.ta as { name?: string } | null)?.name ?? '') as string,
    difficulty: (ar.difficulty as number | null) ?? null,
  }))

  const currentUserName = (user.user_metadata?.name as string | undefined) ?? ''
  const currentUserRole = (user.user_metadata?.role as string | undefined) ?? ''

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/qna"
          className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
          질의응답 목록
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-zinc-950">{question.title || '질문 상세'}</h1>
          <span className="text-sm text-zinc-400">·</span>
          <span className="text-sm text-zinc-500">{question.studentName}</span>
          {question.className && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{question.className}</span>}
        </div>
      </div>

      <QnaDetailClient
        question={question}
        answers={answers}
        currentUserId={user.id}
        currentUserName={currentUserName}
        currentUserRole={currentUserRole}
      />
    </div>
  )
}
