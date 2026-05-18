import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClassesClient } from './_components/classes-client'

export const revalidate = 0

export default async function ClassesPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const [classesRes, tasRes, taAccessRes] = await Promise.all([
    supabase
      .from('class_groups')
      .select(`id, name, subject, grade, schedule, is_active, start_time, end_time, day_of_week, class_members(count)`)
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, name, role')
      .in('role', ['ta_admin', 'ta_assistant'])
      .eq('is_active', true)
      .order('name'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('ta_class_access').select('ta_id, class_id').eq('is_all_classes', false),
  ])

  const allTas = (tasRes.data ?? []).map((t) => ({
    id: t.id as string,
    name: t.name as string,
    role: t.role as string,
  }))

  const taAccessRows = (taAccessRes.data ?? []) as { ta_id: string; class_id: string }[]
  const taByClass = new Map<string, typeof allTas>()
  for (const row of taAccessRows) {
    if (!row.class_id) continue
    const ta = allTas.find((t) => t.id === row.ta_id)
    if (!ta) continue
    if (!taByClass.has(row.class_id)) taByClass.set(row.class_id, [])
    taByClass.get(row.class_id)!.push(ta)
  }

  const rows = (classesRes.data ?? []).map((c) => ({
    id:           c.id,
    name:         c.name,
    subject:      c.subject,
    grade:        c.grade,
    schedule:     c.schedule,
    start_time:   c.start_time,
    end_time:     c.end_time,
    day_of_week:  c.day_of_week,
    is_active:    c.is_active,
    studentCount: (c.class_members as { count: number }[])[0]?.count ?? 0,
    tas:          taByClass.get(c.id) ?? [],
  }))

  return (
    <div>
      <ClassesClient classes={rows} allTas={allTas} />
    </div>
  )
}
