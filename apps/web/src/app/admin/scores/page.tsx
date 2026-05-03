import { createAdminClient } from '@/lib/supabase/admin'
import { ScoresClient } from './_components/scores-client'

export default async function ScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; date?: string }>
}) {
  const { classId: selectedClassId, date: selectedDate } = await searchParams
  const adminSupabase = createAdminClient()

  const { data: classes } = await adminSupabase
    .from('class_groups')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  let query = adminSupabase
    .from('tests')
    .select('id, title, exam_type, test_date, total_q, obj_q, subj_q, difficulty, max_score, grade_cuts, class_id, created_at, class_groups!class_id(name)')
    .order('test_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (selectedClassId) query = query.eq('class_id', selectedClassId) as typeof query
  if (selectedDate)    query = query.eq('test_date', selectedDate)   as typeof query

  const { data: tests } = await query

  const testList = (tests ?? []).map((t) => ({
    id:        t.id        as string,
    title:     t.title     as string,
    examType:  t.exam_type as string,
    testDate:  t.test_date as string,
    totalQ:    t.total_q   as number | null,
    objQ:      t.obj_q     as number | null,
    subjQ:     t.subj_q    as number | null,
    difficulty:(t.difficulty ?? '') as string,
    maxScore:  t.max_score as number,
    gradeCuts: t.grade_cuts as Record<string, number> | null,
    classId:   t.class_id  as string,
    className: ((t.class_groups as unknown as { name: string } | null)?.name ?? '') as string,
  }))

  return (
    <ScoresClient
      classOptions={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
      selectedClassId={selectedClassId ?? null}
      selectedDate={selectedDate ?? null}
      tests={testList}
    />
  )
}
