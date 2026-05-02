import { createClient } from '@/lib/supabase/server'
import { ClassesClient } from './_components/classes-client'

export default async function ClassesPage() {
  const supabase = await createClient()

  const { data: classes } = await supabase
    .from('class_groups')
    .select(`
      id, name, subject, grade, schedule, is_active,
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
    is_active:    c.is_active,
    studentCount: (c.class_members as unknown as { count: number }[])[0]?.count ?? 0,
  }))

  return (
    <div>
      <ClassesClient classes={rows} />
    </div>
  )
}
