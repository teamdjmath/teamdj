'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type StaffStatus = 'online' | 'busy' | 'offline'

export async function updateStaffStatus(status: StaffStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증 필요')

  const { error } = await supabase
    .from('staff_status')
    .upsert(
      { user_id: user.id, status, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )

  if (error) throw new Error(error.message)
  revalidatePath('/admin/staff')
}
