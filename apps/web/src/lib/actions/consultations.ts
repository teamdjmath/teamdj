'use server'

import { createAdminClient } from '@/lib/supabase/admin'
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

export async function getUnreadConsultationCount(): Promise<number> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (admin as any)
    .from('consultations')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)

  return count ?? 0
}
