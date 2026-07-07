'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markConsultationRead(id: string): Promise<{ error?: string }> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('consultations')
    .update({ is_read: true })
    .eq('id', id)

  if (error) return { error: '처리에 실패했습니다.' }
  revalidatePath('/admin/consultations')
  return {}
}

export async function submitInquiry(content: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const studentName = (user.user_metadata?.name as string | undefined) ?? '이름 없음'

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('student_inquiries').insert({
    user_id:      user.id,
    student_name: studentName,
    content:      content.trim(),
  })

  if (error) return { error: '문의 전송에 실패했습니다. 다시 시도해주세요.' }
  revalidatePath('/admin/consultations')
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
  revalidatePath('/admin/consultations')
  return {}
}

export async function getUnreadConsultationCount(): Promise<number> {
  const admin = createAdminClient()
  // 상담 & 문의 페이지가 랜딩 상담 신청 + 학생 1:1 문의를 모두 보여주므로 뱃지도 둘 다 합산
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  const [consultationsRes, inquiriesRes] = await Promise.all([
    db.from('consultations').select('id', { count: 'exact', head: true }).eq('is_read', false),
    db.from('student_inquiries').select('id', { count: 'exact', head: true }).eq('is_read', false),
  ])

  return (consultationsRes.count ?? 0) + (inquiriesRes.count ?? 0)
}
