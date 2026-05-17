import { createClient } from '@/lib/supabase/server'
import { QnaClient } from './_components/qna-client'

export default async function QnaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; classId?: string; textbookId?: string; problemNumber?: string }>
}) {
  const { status: selectedStatus, classId: selectedClassId, textbookId: selectedTextbookId, problemNumber: selectedProblemNumber } = await searchParams
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [classesRes, textbooksRes] = await Promise.all([
    supabase.from('class_groups').select('id, name').eq('is_active', true).order('name'),
    db.from('textbooks').select('id, name').order('name'),
  ])

  // textbook_id/problem_number/textbooks join available after migration - using any cast
  let query = db
    .from('qna_questions')
    .select(
      'id, title, content, status, created_at, assigned_ta_id, textbook_id, problem_number, student:users!student_id(name), class:class_groups!class_id(name), assigned_ta:users!assigned_ta_id(name), textbook:textbooks!textbook_id(name)',
    )
    .order('created_at', { ascending: false })

  if (selectedStatus && selectedStatus !== 'all') {
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

  const { data: rows } = await query

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
    }
  })

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

  return (
    <QnaClient
      classOptions={(classesRes.data ?? []).map((c) => ({ id: c.id, name: c.name }))}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      textbookOptions={(textbooksRes.data ?? []).map((t: any) => ({ id: t.id as string, name: t.name as string }))}
      selectedStatus={selectedStatus ?? 'all'}
      selectedClassId={selectedClassId ?? null}
      selectedTextbookId={selectedTextbookId ?? null}
      selectedProblemNumber={selectedProblemNumber ?? ''}
      questions={questionsWithDup}
    />
  )
}
