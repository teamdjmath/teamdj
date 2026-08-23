'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/lib/types/actions'
import { headers } from 'next/headers'
import { logger } from '@/lib/logger'

// currentPassword가 있으면(본인이 자발적으로 바꾸는 경우) 재인증 후 진행 — 세션이 열려 있다는
// 이유만으로 바꿀 수 있으면 공용 PC에 로그인 세션이 남았을 때 위험하다. 최초 로그인 강제 변경
// 흐름(관리자가 알려준 초기/재설정 비밀번호로 로그인한 직후)은 currentPassword 없이 그대로 둔다.
export async function changePassword(newPassword: string, currentPassword?: string): Promise<ActionResult> {
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: '비밀번호는 8자 이상이어야 합니다.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  if (currentPassword) {
    const { error: reauthErr } = await supabase.auth.signInWithPassword({ email: user.email ?? '', password: currentPassword })
    if (reauthErr) return { success: false, error: '현재 비밀번호가 올바르지 않습니다.' }
  }

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

// 비밀번호 찾기(이메일 재설정) — 학생은 실제로 받을 수 있는 이메일이 없는 로그인 계정(전화번호
// 기반 가짜 이메일)이라 이 기능은 사실상 조교/선생님(실제 이메일로 로그인)만 쓸 수 있다.
// 계정 존재 여부가 새어나가지 않도록 이메일이 없거나 발송에 실패해도 항상 success를 반환한다.
export async function requestPasswordReset(email: string): Promise<ActionResult> {
  if (!email.trim()) return { success: false, error: '이메일을 입력해주세요.' }

  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const origin = `${proto}://${h.get('host')}`

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${origin}/reset-password`,
  })
  if (error) logger.warn('requestPasswordReset:failed', { action: 'requestPasswordReset', error })

  return { success: true }
}
