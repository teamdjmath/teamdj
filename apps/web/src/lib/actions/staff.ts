'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'

export type StaffStatus = 'online' | 'busy' | 'offline'

export async function updateStaffStatus(status: StaffStatus): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('updateStaffStatus', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const { error } = await supabase
      .from('staff_status')
      .upsert(
        { user_id: user.id, status, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
    if (error) throw error

    revalidatePath('/admin/schedule')
    return { success: true }
  })
}
