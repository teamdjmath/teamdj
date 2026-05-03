import { createClient } from '@/lib/supabase/server'
import { QnaClient } from './_components/qna-client'

export default async function QnaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; classId?: string }>
}) {
  const { status: selectedStatus, classId: selectedClassId } = await searchParams
  const supabase = await createClient()

  const { data: classes } = await supabase
    .from('class_groups')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  let query = supabase
    .from('qna_questions')
    .select(
      'id, content, status, created_at, assigned_ta_id, student:users!student_id(name), class:class_groups!class_id(name), assigned_ta:users!assigned_ta_id(name)',
    )
    .order('created_at', { ascending: false })

  if (selectedStatus && selectedStatus !== 'all') {
    query = query.eq('status', selectedStatus) as typeof query
  }
  if (selectedClassId) {
    query = query.eq('class_id', selectedClassId) as typeof query
  }

  const { data: rows } = await query

  type AnyRow = typeof rows extends (infer T)[] | null ? T : never
  const questions = (rows ?? []).map((q: AnyRow) => {
    const r = q as Record<string, unknown>
    return {
      id: r.id as string,
      content: (r.content as string).slice(0, 80),
      status: r.status as 'open' | 'in_progress' | 'answered',
      created_at: r.created_at as string,
      assigned_ta_id: (r.assigned_ta_id ?? null) as string | null,
      studentName: ((r.student as { name?: string } | null)?.name ?? '') as string,
      className: ((r.class as { name?: string } | null)?.name ?? null) as string | null,
      assignedTaName: ((r.assigned_ta as { name?: string } | null)?.name ?? null) as string | null,
    }
  })

  return (
    <QnaClient
      classOptions={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
      selectedStatus={selectedStatus ?? 'all'}
      selectedClassId={selectedClassId ?? null}
      questions={questions}
    />
  )
}
