'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/lib/types/actions'

export async function changePassword(newPassword: string): Promise<ActionResult> {
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: '비밀번호는 8자 이상이어야 합니다.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  // 비밀번호 변경
  const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword })
  if (pwErr) return { success: false, error: pwErr.message }

  // auth user_metadata 및 users 테이블 플래그 해제
  const adminSupabase = createAdminClient()
  await adminSupabase.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, must_change_password: false },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await adminSupabase.from('users').update({ must_change_password: false } as any).eq('id', user.id)

  return { success: true }
}
