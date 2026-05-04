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
  const { data: student } = await supabase
    .from('users')
    .select('id, name, phone, is_active, created_at, school, grade')
    .eq('id', id)
    .eq('role', 'student')
    .single()

  if (!student) notFound()

  // 소속 반 (활성)
  const { data: membership } = await supabase
    .from('class_members')
    .select('id, class_id, enrolled_at, class_groups(id, name, subject, grade)')
    .eq('student_id', id)
    .eq('is_active', true)
    .maybeSingle()

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

  const currentClass = membership
    ? {
        memberId:   (membership as unknown as MembershipData).id,
        classId:    (membership as unknown as MembershipData).class_id,
        className:  (membership as unknown as MembershipData).class_groups?.name ?? '',
        subject:    (membership as unknown as MembershipData).class_groups?.subject ?? '',
        grade:      (membership as unknown as MembershipData).class_groups?.grade ?? '',
        enrolledAt: (membership as unknown as MembershipData).enrolled_at,
      }
    : null

  const parents = (parentLinks ?? []).map((pl) => ({
    linkId: (pl as unknown as ParentLinkData).id,
    id:     (pl as unknown as ParentLinkData).users?.id ?? '',
    name:   (pl as unknown as ParentLinkData).users?.name ?? '',
    phone:  (pl as unknown as ParentLinkData).users?.phone ?? '',
  }))

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
          id:        student.id,
          name:      student.name,
          phone:     student.phone,
          school:    student.school,
          grade:     student.grade,
          is_active: student.is_active,
          createdAt: student.created_at,
        }}
        currentClass={currentClass}
        parents={parents}
        classOptions={classOptions}
      />
    </div>
  )
}
