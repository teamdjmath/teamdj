import { createClient } from '@/lib/supabase/server'
import { StudentsClient } from './_components/students-client'

const PAGE_SIZE = 50

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; classId?: string; status?: string }>
}) {
  const { page: pageParam = '1', q = '', classId: filterClassId = '', status: filterStatus = '' } = await searchParams
  const page = Math.max(1, parseInt(pageParam) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const supabase = await createClient()

  type ClassMember = {
    class_id: string
    is_active: boolean
    class_groups: { name: string } | null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let studentsQuery = (supabase as any)
    .from('users')
    .select(`
      id, name, phone, is_active, school, grade, suspended_from, suspended_until,
      class_members!student_id(class_id, is_active, class_groups(name)),
      parent_links!student_id(id)
    `, { count: 'exact' })
    .eq('role', 'student')
    .order('name')
    .range(from, to)

  if (q) {
    studentsQuery = studentsQuery.or(`name.ilike.%${q}%,phone.ilike.%${q}%`) as typeof studentsQuery
  }
  if (filterClassId) {
    studentsQuery = studentsQuery.eq('class_members.class_id', filterClassId) as typeof studentsQuery
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

  const today = new Date().toISOString().slice(0, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((studentsRes.data ?? []) as any[]).map((s) => {
    const activeClasses = (s.class_members as ClassMember[]).filter((m) => m.is_active)
    const suspFrom = s.suspended_from as string | null
    const suspUntil = s.suspended_until as string | null
    const isSuspended = !!(suspFrom && suspUntil && suspFrom <= today && today <= suspUntil)
    return {
      id:             s.id as string,
      name:           s.name as string,
      phone:          (s.phone ?? '') as string,
      school:         s.school as string | null,
      grade:          s.grade as string | null,
      is_active:      s.is_active as boolean,
      suspendedUntil: isSuspended ? (suspUntil as string) : null,
      classes:        activeClasses.map((m) => ({ id: m.class_id, name: m.class_groups?.name ?? '' })),
      hasParent:      (s.parent_links as { id: string }[]).length > 0,
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
      filterClassId={filterClassId}
      filterStatus={filterStatus}
    />
  )
}
