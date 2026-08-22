'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { revalidatePath } from 'next/cache'

export async function submitInquiry(content: string): Promise<{ error?: string }> {
  const user = await getVerifiedUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const admin = createAdminClient()
  // user_metadata는 세션 발급 시점 스냅샷이라 이름이 바뀌어도 재로그인 전까지 옛 이름을 그대로
  // 들고 있다 — users 테이블의 현재 이름을 조회해 쓴다.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: liveStudent } = await (admin as any).from('users').select('name').eq('id', user.id).maybeSingle()
  const studentName = (liveStudent?.name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? '이름 없음'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('student_inquiries').insert({
    user_id:      user.id,
    student_name: studentName,
    content:      content.trim(),
  })

  if (error) return { error: '문의 전송에 실패했습니다. 다시 시도해주세요.' }
  revalidatePath('/admin/messages')
  return {}
}

export async function markInquiryRead(id: string): Promise<{ error?: string }> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('student_inquiries')
    .update({ is_read: true })
    .eq('id', id)

  if (error) return { error: '처리에 실패했습니다.' }
  revalidatePath('/admin/messages')
  return {}
}

export async function getUnreadConsultationCount(): Promise<number> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (admin as any)
    .from('student_inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)

  return count ?? 0
}
