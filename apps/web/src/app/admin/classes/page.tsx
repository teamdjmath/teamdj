import { createClient } from '@/lib/supabase/server'
import { ClassesClient } from './_components/classes-client'

export const revalidate = 0

export default async function ClassesPage() {
  const supabase = await createClient()

  const { data: classes } = await supabase
    .from('class_groups')
    .select(`
      id, name, subject, grade, schedule, is_active,
      start_time, end_time, day_of_week,
      class_members(count)
    `)
    .order('created_at', { ascending: false })

  // 학생 수를 flat하게 변환
  const rows = (classes ?? []).map((c) => ({
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
  }))

  return (
    <div>
      <ClassesClient classes={rows} />
    </div>
  )
}
