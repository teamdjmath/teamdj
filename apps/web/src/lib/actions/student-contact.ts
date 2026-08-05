'use server'

import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/lib/types/actions'

const CONTACT_DAYS = 7 // 승인 유효기간 — 기간제 (7일 후 자동 만료)

// 학생 연락처(전화번호) 열람 요청 — 클리닉 조교 등 학생 관리 권한이 없는 스태프용
export async function requestStudentContact(studentId: string, reason?: string): Promise<ActionResult> {
  const user = await getVerifiedUser()

  return withAction('requestStudentContact', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) {
      return { success: false, error: '권한이 없습니다.' }
    }

    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = admin as any

    // 이미 대기 중인 요청이 있으면 중복 생성하지 않고 그대로 안내
    const { data: existing } = await db
      .from('student_contact_requests')
      .select('id')
      .eq('student_id', studentId)
      .eq('requested_by', user.id)
      .eq('status', 'pending')
      .maybeSingle()
    if (existing) return { success: true }

    const { data: student } = await admin.from('users').select('name').eq('id', studentId).maybeSingle()

    const { error } = await db.from('student_contact_requests').insert({
      student_id: studentId,
      requested_by: user.id,
      reason: reason?.trim() || null,
    })
    if (error) throw error

    await logAudit(user, {
      action: 'contact.request', targetType: 'student',
      targetId: studentId, targetLabel: (student as { name?: string } | null)?.name ?? '',
    })

    revalidatePath('/admin/roster')
    return { success: true }
  })
}

// 선생님의 승인/거절 — "선생님 이상급 승인"
export async function decideContactRequest(requestId: string, approve: boolean): Promise<ActionResult> {
  const user = await getVerifiedUser()

  return withAction('decideContactRequest', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (role !== 'teacher') return { success: false, error: '선생님만 승인/거절할 수 있습니다.' }

    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = admin as any

    const { data: reqRow } = await db
      .from('student_contact_requests')
      .select('id, student_id, requested_by, status, users!student_id(name)')
      .eq('id', requestId)
      .maybeSingle()
    if (!reqRow) return { success: false, error: '요청을 찾을 수 없습니다.' }
    if (reqRow.status !== 'pending') return { success: false, error: '이미 처리된 요청입니다.' }

    const now = new Date()
    const expiresAt = approve ? new Date(now.getTime() + CONTACT_DAYS * 86_400_000).toISOString() : null

    const { error } = await db
      .from('student_contact_requests')
      .update({
        status: approve ? 'approved' : 'rejected',
        decided_by: user.id,
        decided_at: now.toISOString(),
        expires_at: expiresAt,
      })
      .eq('id', requestId)
    if (error) throw error

    await logAudit(user, {
      action: approve ? 'contact.approve' : 'contact.reject',
      targetType: 'student',
      targetId: reqRow.student_id as string,
      targetLabel: (reqRow.users as { name?: string } | null)?.name ?? '',
      detail: { requesterId: reqRow.requested_by, expiresAt },
    })

    revalidatePath('/admin/roster')
    return { success: true }
  })
}

// 승인된 연락처를 실제로 열람할 때 — 조회 자체를 감사 로그에 남긴다 (PII 열람 추적)
export async function viewStudentContact(studentId: string): Promise<ActionResult<{ phone: string; parentPhones: string[] }>> {
  const user = await getVerifiedUser()

  return withAction('viewStudentContact', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) {
      return { success: false, error: '권한이 없습니다.' }
    }

    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = admin as any

    // teacher/ta_desk는 원래도 학생 관리 페이지에서 전체 연락처를 볼 수 있는 권한이라 승인 불요.
    // ta_assistant(클리닉 조교)만 승인된 유효 요청이 있어야 통과.
    if (role === 'ta_assistant') {
      const { data: approved } = await db
        .from('student_contact_requests')
        .select('id, expires_at')
        .eq('student_id', studentId)
        .eq('requested_by', user.id)
        .eq('status', 'approved')
        .order('decided_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const isValid = approved?.expires_at && new Date(approved.expires_at) > new Date()
      if (!isValid) return { success: false, error: '승인된 열람 권한이 없거나 만료되었습니다.' }
    }

    const { data: student } = await admin.from('users').select('name, phone').eq('id', studentId).maybeSingle()
    if (!student) return { success: false, error: '학생을 찾을 수 없습니다.' }

    const { data: parentLinks } = await db
      .from('parent_links')
      .select('parent:users!parent_id(phone)')
      .eq('student_id', studentId)
    const parentPhones = ((parentLinks ?? []) as Array<{ parent: { phone?: string } | null }>)
      .map((l) => l.parent?.phone)
      .filter((p): p is string => !!p)

    await logAudit(user, {
      action: 'contact.view', targetType: 'student',
      targetId: studentId, targetLabel: (student as { name?: string }).name ?? '',
    })

    return { success: true, data: { phone: (student as { phone?: string }).phone ?? '', parentPhones } }
  })
}
