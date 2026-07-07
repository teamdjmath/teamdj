'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'
import { logger } from '@/lib/logger'
import { logAudit } from '@/lib/audit'

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

// 조교(ta_desk/ta_assistant) 계정 삭제 — 선생님만 가능, 선생님 계정은 이 함수로 삭제할 수 없음
export async function deleteTaAccount(taId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  return withAction('deleteTaAccount', caller?.id, async () => {
    if (!caller) return { success: false, error: '인증이 필요합니다.' }

    const callerRole = caller.user_metadata?.role as string | undefined
    if (callerRole !== 'teacher') return { success: false, error: '선생님만 조교 계정을 삭제할 수 있습니다.' }

    const adminSupabase = createAdminClient()

    const { data: target } = await adminSupabase
      .from('users').select('name, role').eq('id', taId).maybeSingle()

    const targetRole = (target as { role?: string } | null)?.role
    if (!targetRole || !['ta_desk', 'ta_assistant'].includes(targetRole)) {
      return { success: false, error: '조교 계정만 삭제할 수 있습니다.' }
    }

    const { error: dbErr } = await adminSupabase.from('users').delete().eq('id', taId)
    if (dbErr) throw dbErr

    const { error: authErr } = await adminSupabase.auth.admin.deleteUser(taId)
    if (authErr) logger.warn('deleteTaAccount:auth-delete-failed', { action: 'deleteTaAccount', userId: caller.id, error: authErr })

    await logAudit(caller, {
      action: 'staff.delete', targetType: 'staff',
      targetId: taId, targetLabel: (target as { name?: string } | null)?.name ?? '',
    })

    revalidatePath('/admin/dashboard')
    revalidatePath('/admin/staff')
    return { success: true }
  })
}
