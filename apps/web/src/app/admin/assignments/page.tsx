import { createAdminClient } from '@/lib/supabase/admin'
import { AssignmentsClient } from './_components/assignments-client'

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>
}) {
  const { classId: selectedClassId } = await searchParams
  const adminSupabase = createAdminClient()

  const { data: classes } = await adminSupabase
    .from('class_groups')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  type AssignmentRow = {
    id: string; title: string; category: string | null
    issue_date: string | null; due_date: string | null
    week_num: number | null; class_id: string; created_at: string
    class_groups: { name: string } | null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let baseQuery = (adminSupabase as any)
    .from('assignments')
    .select('id, title, category, issue_date, due_date, week_num, class_id, created_at, class_groups!class_id(name)')
    .order('week_num', { ascending: true })
    .order('created_at', { ascending: false })

  if (selectedClassId) {
    baseQuery = baseQuery.eq('class_id', selectedClassId)
  }

  const { data: rows } = await baseQuery as { data: AssignmentRow[] | null }

  const assignments = (rows ?? []).map((a) => ({
    id:         a.id,
    title:      a.title,
    category:   a.category   ?? '',
    issue_date: a.issue_date ?? '',
    due_date:   a.due_date   ?? '',
    week_num:   a.week_num,
    class_id:   a.class_id,
    className:  a.class_groups?.name ?? '',
  }))

  const { data: catRows } = await adminSupabase
    .from('assignment_categories')
    .select('name')
    .order('name')
  
  const categoryOptions = (catRows ?? []).map(r => r.name as string)

  return (
    <AssignmentsClient
      classOptions={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
      selectedClassId={selectedClassId ?? null}
      assignments={assignments}
      categoryOptions={categoryOptions}
    />
  )
}
