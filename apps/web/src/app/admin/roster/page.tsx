import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getVisibleClassOptions } from '@/lib/data/class-options'
import { RosterClient, type ClassGroup } from './_components/roster-client'

export const dynamic = 'force-dynamic'

const STAFF_ROLES = ['teacher', 'ta_desk', 'ta_assistant']

export default async function RosterPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/login')

  const role = user.user_metadata?.role as string | undefined
  if (!STAFF_ROLES.includes(role ?? '')) redirect('/admin/dashboard')

  const isAssistant = role === 'ta_assistant'

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const [classes, membersRes, myRequestsRes] = await Promise.all([
    getVisibleClassOptions(),
    admin
      .from('class_members')
      .select('class_id, student_id, users!student_id(id, name, school, grade)')
      .eq('is_active', true),
    // 클리닉 조교 본인이 낸 요청 이력 — 학생별 최신 상태 판단용
    // (선생님의 승인 대기 큐는 /admin/dashboard로 이동)
    isAssistant
      ? db
          .from('student_contact_requests')
          .select('student_id, status, expires_at, requested_at')
          .eq('requested_by', user.id)
          .order('requested_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const visibleClassNames = new Set(classes.map((c) => c.name))

  type MemberRow = { class_id: string; student_id: string; users: { id: string; name: string; school: string | null; grade: string | null } | null }
  const byClass = new Map<string, Array<{ id: string; name: string; school: string; grade: string }>>()
  for (const m of (membersRes.data ?? []) as MemberRow[]) {
    const u = m.users
    if (!u?.name) continue
    if (!byClass.has(m.class_id)) byClass.set(m.class_id, [])
    byClass.get(m.class_id)!.push({ id: u.id, name: u.name, school: u.school ?? '', grade: u.grade ?? '' })
  }

  const classGroups: ClassGroup[] = classes
    .filter((c) => visibleClassNames.has(c.name))
    .map((c) => ({
      id: c.id,
      name: c.name,
      students: (byClass.get(c.id) ?? []).sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    }))
    .filter((c) => c.students.length > 0)

  // 학생별 "내 최신 요청 상태" — 클리닉 조교만 사용
  type ReqRow = { student_id: string; status: string; expires_at: string | null; requested_at: string }
  const myStatusByStudent: Record<string, { status: string; expiresAt: string | null }> = {}
  for (const r of (myRequestsRes.data ?? []) as ReqRow[]) {
    if (myStatusByStudent[r.student_id]) continue // 이미 최신(첫 등장) 기록함
    myStatusByStudent[r.student_id] = { status: r.status, expiresAt: r.expires_at }
  }

  return (
    <RosterClient
      role={role ?? ''}
      classGroups={classGroups}
      myStatusByStudent={myStatusByStudent}
    />
  )
}
