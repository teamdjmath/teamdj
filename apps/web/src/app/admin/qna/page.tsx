import { createClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { getActiveClassOptions } from '@/lib/data/class-options'
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
    getActiveClassOptions(),
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
  if (selectedTaId) {
    query = query.eq('assigned_ta_id', selectedTaId)
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
      myStats={myStats}
      currentUserId={user?.id ?? null}
    />
  )
}
