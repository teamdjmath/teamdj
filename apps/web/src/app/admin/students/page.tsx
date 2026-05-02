import { createClient } from '@/lib/supabase/server'
import { StudentsClient } from './_components/students-client'

export default async function StudentsPage() {
  const supabase = await createClient()

  // 학생 목록 + 소속 반 + 학부모 연결 여부
  const { data: students } = await supabase
    .from('users')
    .select(`
      id, name, phone, is_active,
      class_members!student_id(class_id, is_active, class_groups(name)),
      parent_links!student_id(id)
    `)
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  // 분반 목록 (학생 등록 모달용)
  const { data: classes } = await supabase
    .from('class_groups')
    .select('id, name, subject, grade')
    .eq('is_active', true)
    .order('name')

  type ClassMember = {
    class_id: string
    is_active: boolean
    class_groups: { name: string } | null
  }

  const rows = (students ?? []).map((s) => {
    const activeClass = (s.class_members as unknown as ClassMember[])
      .find((m) => m.is_active)
    return {
      id:           s.id,
      name:         s.name,
      phone:        s.phone,
      is_active:    s.is_active,
      className:    activeClass?.class_groups?.name ?? null,
      classId:      activeClass?.class_id ?? null,
      hasParent:    (s.parent_links as unknown as { id: string }[]).length > 0,
    }
  })

  const classOptions = (classes ?? []).map((c) => ({
    id:      c.id,
    label:   `${c.name} (${c.subject} · ${c.grade})`,
  }))

  return <StudentsClient students={rows} classOptions={classOptions} />
}
