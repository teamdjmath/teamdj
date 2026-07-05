import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QnaListClient } from './_components/qna-list-client'

export default async function QnAListPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; textbookId?: string; problemNumber?: string }>
}) {
  const { tab: rawTab, textbookId: selectedTextbookId, problemNumber: selectedProblemNumber } = await searchParams
  const tab = rawTab === 'class' ? 'class' : 'my'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // 분반 전체 질문 (RLS가 분반 범위 제어)
  let classQuery = db
    .from('qna_questions')
    .select('id, title, status, created_at, problem_number, student:users!student_id(name), textbook:textbooks!textbook_id(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (selectedTextbookId) {
    classQuery = classQuery.eq('textbook_id', selectedTextbookId)
  }
  if (selectedProblemNumber) {
    classQuery = classQuery.ilike('problem_number', `%${selectedProblemNumber}%`)
  }

  // 내 질문 / 교재 목록 / 분반 질문 — 서로 독립이라 병렬 실행
  const [{ data: myRows }, { data: textbookRows }, { data: classRows }] = await Promise.all([
    supabase
      .from('qna_questions')
      .select('id, title, status, created_at')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false }),
    db.from('textbooks').select('id, name').order('name'),
    classQuery,
  ])

  const myQuestions = (myRows ?? []).map((q) => ({
    id: q.id as string,
    title: (q.title as string | null) ?? '',
    status: q.status as string,
    created_at: q.created_at as string,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const classQuestions = (classRows ?? []).map((q: any) => {
    const r = q as Record<string, unknown>
    return {
      id: r.id as string,
      title: (r.title as string | null) ?? '',
      status: r.status as string,
      created_at: r.created_at as string,
      problem_number: (r.problem_number ?? null) as string | null,
      studentName: ((r.student as { name?: string } | null)?.name ?? '') as string,
      textbookName: ((r.textbook as { name?: string } | null)?.name ?? null) as string | null,
    }
  })

  return (
    <QnaListClient
      tab={tab}
      myQuestions={myQuestions}
      classQuestions={classQuestions}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      textbooks={(textbookRows ?? []).map((t: any) => ({ id: t.id as string, name: t.name as string }))}
      selectedTextbookId={selectedTextbookId ?? ''}
      selectedProblemNumber={selectedProblemNumber ?? ''}
    />
  )
}
