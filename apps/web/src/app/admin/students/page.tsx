import { createClient } from '@/lib/supabase/server'
import { StudentsClient } from './_components/students-client'

const PAGE_SIZE = 50

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const { page: pageParam = '1', q = '' } = await searchParams
  const page = Math.max(1, parseInt(pageParam) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const supabase = await createClient()

  type ClassMember = {
    class_id: string
    is_active: boolean
    class_groups: { name: string } | null
  }

  let studentsQuery = supabase
    .from('users')
    .select(`
      id, name, phone, is_active, school, grade,
      class_members!student_id(class_id, is_active, class_groups(name)),
      parent_links!student_id(id)
    `, { count: 'exact' })
    .eq('role', 'student')
    .order('name')
    .range(from, to)

  if (q) {
    studentsQuery = studentsQuery.or(`name.ilike.%${q}%,phone.ilike.%${q}%`) as typeof studentsQuery
  }

  const [studentsRes, classesRes] = await Promise.all([
    studentsQuery,
    supabase
      .from('class_groups')
      .select('id, name, subject, grade')
      .eq('is_active', true)
      .order('name'),
  ])

  const totalCount = studentsRes.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const rows = (studentsRes.data ?? []).map((s) => {
    const activeClass = (s.class_members as ClassMember[]).find((m) => m.is_active)
    return {
      id:           s.id,
      name:         s.name,
      phone:        s.phone ?? '',
      school:       s.school,
      grade:        s.grade,
      is_active:    s.is_active,
      className:    activeClass?.class_groups?.name ?? null,
      classId:      activeClass?.class_id ?? null,
      hasParent:    (s.parent_links as { id: string }[]).length > 0,
    }
  })

  const classOptions = (classesRes.data ?? []).map((c) => ({
    id:    c.id,
    label: `${c.name} (${c.subject} · ${c.grade})`,
  }))

  return (
    <StudentsClient
      students={rows}
      classOptions={classOptions}
      totalCount={totalCount}
      page={page}
      totalPages={totalPages}
      q={q}
    />
  )
}
