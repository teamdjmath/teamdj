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

  let query = adminSupabase
    .from('assignments')
    .select('id, title, category, due_date, week_num, class_id, created_at, class_groups!class_id(name)')
    .order('week_num', { ascending: true })
    .order('created_at', { ascending: false })

  if (selectedClassId) {
    query = query.eq('class_id', selectedClassId) as typeof query
  }

  const { data: rows } = await query

  const assignments = (rows ?? []).map((a) => ({
    id:        a.id as string,
    title:     a.title as string,
    category:  (a.category  ?? '') as string,
    due_date:  (a.due_date  ?? '') as string,
    week_num:  a.week_num as number | null,
    class_id:  a.class_id as string,
    className: (a.class_groups as { name: string } | null)?.name ?? '',
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
