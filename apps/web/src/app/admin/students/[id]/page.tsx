import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StudentDetailClient } from './_components/student-detail-client'

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // 학생 기본 정보
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: student } = await (supabase as any)
    .from('users')
    .select('id, name, phone, is_active, created_at, school, grade, suspended_from, suspended_until')
    .eq('id', id)
    .eq('role', 'student')
    .single()

  if (!student) notFound()

  // 소속 반 (활성 전체)
  const { data: memberships } = await supabase
    .from('class_members')
    .select('id, class_id, enrolled_at, class_groups(id, name, subject, grade)')
    .eq('student_id', id)
    .eq('is_active', true)
    .order('enrolled_at')

  // 학부모 연결 목록
  const { data: parentLinks } = await supabase
    .from('parent_links')
    .select('id, users!parent_id(id, name, phone)')
    .eq('student_id', id)

  // 분반 선택 옵션
  const { data: allClasses } = await supabase
    .from('class_groups')
    .select('id, name, subject, grade')
    .eq('is_active', true)
    .order('name')

  type ClassGroupData = { id: string; name: string; subject: string; grade: string }
  type MembershipData = {
    id: string
    class_id: string
    enrolled_at: string
    class_groups: ClassGroupData | null
  }
  type ParentUser = { id: string; name: string; phone: string }
  type ParentLinkData = { id: string; users: ParentUser | null }

  const currentClasses = (memberships as MembershipData[] ?? []).map((m) => ({
    memberId:   m.id,
    classId:    m.class_id,
    className:  m.class_groups?.name ?? '',
    subject:    m.class_groups?.subject ?? '',
    grade:      m.class_groups?.grade ?? '',
    enrolledAt: m.enrolled_at,
  }))

  const parents = (parentLinks ?? []).map((pl) => {
    const p = pl as ParentLinkData
    return {
      linkId: p.id,
      id:     p.users?.id ?? '',
      name:   p.users?.name ?? '',
      phone:  p.users?.phone ?? '',
    }
  })

  const classOptions = (allClasses ?? []).map((c) => ({
    id:    c.id,
    label: `${c.name} (${c.subject} · ${c.grade})`,
  }))

  return (
    <div>
      {/* 브레드크럼 */}
      <div className="mb-4 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/admin/students" className="hover:text-zinc-700">학생 관리</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">{student.name}</span>
      </div>

      <StudentDetailClient
        student={{
          id:             student.id as string,
          name:           student.name as string,
          phone:          student.phone as string | null,
          school:         student.school as string | null,
          grade:          student.grade as string | null,
          is_active:      student.is_active as boolean,
          createdAt:      student.created_at as string,
          suspendedFrom:  student.suspended_from as string | null,
          suspendedUntil: student.suspended_until as string | null,
        }}
        currentClasses={currentClasses}
        parents={parents}
        classOptions={classOptions}
      />
    </div>
  )
}
