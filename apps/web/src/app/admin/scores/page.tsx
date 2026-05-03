import { createClient } from '@/lib/supabase/server'
import { ScoresClient } from './_components/scores-client'

export default async function ScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; date?: string }>
}) {
  const { classId: selectedClassId, date: selectedDate } = await searchParams
  const supabase = await createClient()

  const { data: classes } = await supabase
    .from('class_groups')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // All active class members for the create modal (classId → students)
  const { data: allMembers } = await supabase
    .from('class_members')
    .select('class_id, student_id, users!student_id(name)')
    .eq('is_active', true)

  const classStudentsMap: Record<string, Array<{ id: string; name: string }>> = {}
  for (const m of allMembers ?? []) {
    const cid = m.class_id as string
    if (!classStudentsMap[cid]) classStudentsMap[cid] = []
    const u = m.users as unknown as { name: string } | null
    if (u?.name) classStudentsMap[cid].push({ id: m.student_id as string, name: u.name })
  }
  // Sort students by name within each class
  for (const cid of Object.keys(classStudentsMap)) {
    classStudentsMap[cid].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }

  // Scores query
  let query = supabase
    .from('test_scores')
    .select('id, score, total_q, obj_q, subj_q, difficulty, test_date, input_method, student_id, class_id, users!student_id(name), class_groups!class_id(name)')
    .order('test_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (selectedClassId) query = query.eq('class_id', selectedClassId) as typeof query
  if (selectedDate) query = query.eq('test_date', selectedDate) as typeof query

  const { data: scores } = await query

  const scoreList = (scores ?? []).map((s) => ({
    id: s.id as string,
    score: s.score as number,
    total_q: s.total_q as number | null,
    obj_q: s.obj_q as number | null,
    subj_q: s.subj_q as number | null,
    difficulty: (s.difficulty ?? '') as string,
    test_date: s.test_date as string,
    input_method: (s.input_method ?? 'manual') as string,
    student_id: s.student_id as string,
    class_id: s.class_id as string,
    studentName: ((s.users as unknown as { name: string } | null)?.name ?? '') as string,
    className: ((s.class_groups as unknown as { name: string } | null)?.name ?? '') as string,
  }))

  return (
    <ScoresClient
      classOptions={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
      classStudentsMap={classStudentsMap}
      selectedClassId={selectedClassId ?? null}
      selectedDate={selectedDate ?? null}
      scores={scoreList}
    />
  )
}
