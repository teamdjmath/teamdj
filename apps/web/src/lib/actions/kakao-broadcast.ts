'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'
import { sendKakaoText, getSolapiConfig } from '@/lib/kakao'
import { logAudit } from '@/lib/audit'

// "문의 & 발송" 화면의 카카오 채널 — 쪽지(인앱)와 달리 학부모도 대상이 될 수 있다(학부모는
// 아직 인앱 수신함이 없어 쪽지 채널 자체가 안 됨). audience로 수신 전화번호를 학생 본인 것을
// 쓸지, 연결된 학부모 것을 쓸지만 갈리고 나머지 대상 범위 로직은 동일해 하나로 합쳤다.
export async function sendKakaoBroadcast(data: {
  audience: 'student' | 'parent'
  scope: 'all' | 'class' | 'individual'
  classId?: string | null
  studentId?: string | null
  title: string
  content: string
}): Promise<ActionResult<{ sentCount: number }>> {
  const user = await getVerifiedUser()

  return withAction('sendKakaoBroadcast', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    if (!data.title.trim() || !data.content.trim()) return { success: false, error: '제목과 내용을 입력하세요.' }
    if (data.scope === 'class' && !data.classId) return { success: false, error: '분반을 선택하세요.' }
    if (data.scope === 'individual' && !data.studentId) return { success: false, error: '학생을 선택하세요.' }

    const admin = createAdminClient()

    let studentIds: string[] | null = null // null = 전체(필터 없음)
    if (data.scope === 'class') {
      const { data: members } = await admin
        .from('class_members')
        .select('student_id')
        .eq('class_id', data.classId as string)
        .eq('is_active', true)
      studentIds = (members ?? []).map((m) => m.student_id as string)
    } else if (data.scope === 'individual') {
      studentIds = [data.studentId as string]
    }

    let phones: (string | null | undefined)[]
    if (data.audience === 'student') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (admin as any).from('users').select('phone').eq('role', 'student')
      if (studentIds) query = query.in('id', studentIds)
      const { data: rows } = await query
      phones = (rows ?? []).map((r: { phone?: string }) => r.phone)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (admin as any).from('parent_links').select('parent:users!parent_id(phone)')
      if (studentIds) query = query.in('student_id', studentIds)
      const { data: rows } = await query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      phones = ((rows ?? []) as any[]).map((r) => (r.parent as { phone?: string } | null)?.phone)
    }

    if (phones.length === 0) return { success: false, error: '연결된 발송 대상이 없습니다.' }

    if (!getSolapiConfig()) return { success: false, error: '카카오 발송 설정이 아직 준비되지 않았습니다.' }
    if (process.env.KAKAO_AUTO_SEND !== 'true') return { success: false, error: '카카오 자동발송이 꺼져 있습니다. (테스트 모드 — KAKAO_AUTO_SEND=true로 켜야 실제 발송됩니다)' }

    const validPhoneCount = phones.filter((p) => p?.replace(/\D/g, '')).length
    if (validPhoneCount === 0) return { success: false, error: '대상자에게 등록된 전화번호가 없어 발송하지 못했습니다.' }

    const text = `[TeamDJ] ${data.title}\n${data.content}`
    const { sentCount, errors } = await sendKakaoText(phones, text, 'sendKakaoBroadcast')

    if (sentCount === 0) {
      return { success: false, error: errors[0] ?? '카카오 발송에 실패했습니다.' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('kakao_broadcasts').insert({
      sender_id: user.id,
      audience: data.audience,
      scope: data.scope,
      class_id: data.scope === 'class' ? data.classId : null,
      student_id: data.scope === 'individual' ? data.studentId : null,
      title: data.title.trim(),
      content: data.content.trim(),
      sent_count: sentCount,
    })

    await logAudit(user, {
      action: 'kakao.broadcast_send', targetType: 'kakao_broadcast',
      targetLabel: data.title.trim(),
      detail: { audience: data.audience, scope: data.scope, classId: data.classId ?? null, studentId: data.studentId ?? null, sentCount },
    })

    revalidatePath('/admin/messages')
    return { success: true, data: { sentCount } }
  })
}
