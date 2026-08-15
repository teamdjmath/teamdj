import { createAdminClient } from '@/lib/supabase/admin'
import { sendKakaoText } from '@/lib/kakao'
import { logger } from '@/lib/logger'

// 학생 대시보드(dashboard/learning)와 동일한 "밀린 과제" 판정: 마감일이 지났고 진행률이
// 100% 미만(진행률 기록이 아예 없으면 0%로 취급). before_enrollment로 표시된 기록만 제외한다.
// 매일 저녁 정해진 시각에 vercel.json cron이 호출 → 학부모에게 학생별로 묶어서 1건 발송.
export async function runOverdueAssignmentsDigest(): Promise<{ studentsNotified: number }> {
  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignments } = await (admin as any)
    .from('assignments')
    .select('id, title, issue_date, class_id')
    .lt('due_date', today)
    .not('due_date', 'is', null)

  if (!assignments || assignments.length === 0) return { studentsNotified: 0 }

  const assignmentIds: string[] = assignments.map((a: { id: string }) => a.id)
  const classIds: string[] = [...new Set<string>(assignments.map((a: { class_id: string }) => a.class_id))]

  const [{ data: members }, { data: progress }] = await Promise.all([
    admin.from('class_members').select('class_id, student_id').in('class_id', classIds).eq('is_active', true),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('assignment_progress')
      .select('assignment_id, student_id, completion_pct, before_enrollment')
      .in('assignment_id', assignmentIds),
  ])

  const progressMap = new Map<string, { pct: number | null; beforeEnrollment: boolean }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (progress ?? []) as any[]) {
    progressMap.set(`${p.assignment_id}:${p.student_id}`, {
      pct: p.completion_pct,
      beforeEnrollment: !!p.before_enrollment,
    })
  }

  type OverdueItem = { title: string; issueDate: string | null; pct: number }
  const byStudent = new Map<string, OverdueItem[]>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const a of assignments as any[]) {
    const classMembers = (members ?? []).filter((m) => m.class_id === a.class_id)
    for (const m of classMembers) {
      const p = progressMap.get(`${a.id}:${m.student_id}`)
      if (p?.beforeEnrollment) continue
      const pct = p?.pct ?? 0
      if (pct >= 100) continue
      const list = byStudent.get(m.student_id as string) ?? []
      list.push({ title: a.title, issueDate: a.issue_date, pct })
      byStudent.set(m.student_id as string, list)
    }
  }

  if (byStudent.size === 0) return { studentsNotified: 0 }

  const studentIds = [...byStudent.keys()]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: parentLinks } = await (admin as any)
    .from('parent_links')
    .select('student_id, parent:users!parent_id(phone), student:users!student_id(name)')
    .in('student_id', studentIds)

  let studentsNotified = 0
  for (const studentId of studentIds) {
    const items = byStudent.get(studentId)!
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const links = ((parentLinks ?? []) as any[]).filter((l) => l.student_id === studentId)
    if (links.length === 0) continue

    const studentName = (links[0].student as { name?: string } | null)?.name ?? '학생'
    const lines = items.map((i) => `- [${i.issueDate ?? '-'}] ${i.title} (${i.pct}%)`).join('\n')
    const text = `[TeamDJ] ${studentName} 학생 밀린 과제 안내\n${lines}`
    const phones = links.map((l) => (l.parent as { phone?: string } | null)?.phone)

    try {
      const { sentCount } = await sendKakaoText(phones, text, 'overdueAssignmentsDigest')
      if (sentCount > 0) studentsNotified++
    } catch (err) {
      logger.warn('overdueAssignmentsDigest:send-failed', { action: 'overdueAssignmentsDigest', userId: studentId, error: err })
    }
  }

  return { studentsNotified }
}
