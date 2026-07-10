'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AuthState = {
  error: string | null
}

const STAFF_ROLES = ['teacher', 'ta_desk', 'ta_assistant']

// 스태프 근무 상태 자동 전환 — 로그인하면 온라인, 로그아웃하면 오프라인.
// 실패해도 로그인/로그아웃 흐름을 막지 않는다.
async function setStaffStatus(userId: string, status: 'online' | 'offline'): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('staff_status').upsert(
      { user_id: userId, status, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  } catch {
    // 상태 갱신 실패는 무시
  }
}

// 로그인 성공/실패 기록 — 이 Supabase 버전은 auth.audit_log_entries에 인증 이벤트를
// 기록하지 않아서(항상 빈 테이블), 모니터링 로그인 지표를 위해 직접 audit_logs에 남긴다.
// 실패해도 로그인 흐름을 막지 않는다. 실패 건은 입력한 아이디를 저장하지 않는다(개인정보).
async function logLoginAttempt(entry: {
  success: boolean
  userId?: string
  name?: string
  role?: string
}): Promise<void> {
  try {
    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('audit_logs').insert({
      actor_id:    entry.userId ?? null,
      actor_name:  entry.name ?? '',
      actor_role:  entry.role ?? '',
      action:      entry.success ? 'auth.login' : 'auth.login_failed',
      target_type: 'auth',
    })
  } catch {
    // 감사 로그 실패는 무시
  }
}

// ────────────────────────────────────────────────
// 로그인
// role: 'student' | 'parent' → 전화번호를 이메일 형식으로 변환
// role: 'teacher' | 'ta_desk' | 'ta_assistant' → 이메일 그대로 사용
// ────────────────────────────────────────────────
export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const tab      = formData.get('tab') as 'student' | 'staff'
  const identity = (formData.get('identity') as string).trim()
  const password = formData.get('password') as string

  // 학생/학부모는 전화번호 → 내부 이메일 포맷으로 변환
  const email =
    tab === 'student'
      ? `${identity.replace(/\D/g, '')}@teamdj.com`
      : identity

  // CI(GitHub Actions)의 E2E 테스트가 매 push마다 이 계정으로 로그인하는데,
  // 실사용자 로그인이 아니라서 감사 로그/모니터링 지표에 섞이면 안 됨.
  // 로컬에서 이 값을 안 쓰면 process.env.E2E_STAFF_EMAIL이 비어있어 아무 영향 없음.
  const isE2eBot = !!process.env.E2E_STAFF_EMAIL && email === process.env.E2E_STAFF_EMAIL

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (!isE2eBot) await logLoginAttempt({ success: false })
    return { error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
  }

  // 로그인 성공 — 역할에 따라 리다이렉트 (proxy.ts 가 처리하지만 명시적으로도 수행)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.user_metadata?.role as string | undefined
  if (!isE2eBot) {
    await logLoginAttempt({
      success: true,
      userId: user?.id,
      name: (user?.user_metadata?.name as string | undefined) ?? '',
      role: role ?? '',
    })
    // 스태프가 로그인하면 근무 상태를 자동으로 온라인 전환 (E2E 봇 제외)
    if (user?.id && STAFF_ROLES.includes(role ?? '')) {
      await setStaffStatus(user.id, 'online')
    }
  }

  const dest = STAFF_ROLES.includes(role ?? '') ? '/admin/dashboard' : '/dashboard'

  redirect(dest)
}

// ────────────────────────────────────────────────
// 회원가입 (선생님 / 조교 전용 — 초대 코드 검증)
// 초대 코드로 역할 자동 결정:
//   TEACHER_INVITE_CODE      → teacher
//   TA_ADMIN_INVITE_CODE     → ta_desk  (사무 조교)
//   TA_ASSISTANT_INVITE_CODE → ta_assistant (첨삭 조교)
//   TA_INVITE_CODE           → ta_desk  (하위 호환)
// ────────────────────────────────────────────────
export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name       = (formData.get('name') as string).trim()
  const email      = (formData.get('email') as string).trim()
  const password   = formData.get('password') as string
  const inviteCode = (formData.get('inviteCode') as string).trim()

  const teacherCode        = process.env.TEACHER_INVITE_CODE
  const taAdminCode        = process.env.TA_ADMIN_INVITE_CODE
  const taAssistantCode    = process.env.TA_ASSISTANT_INVITE_CODE
  const taCodeLegacy       = process.env.TA_INVITE_CODE

  let role: 'teacher' | 'ta_desk' | 'ta_assistant' | null = null
  if (inviteCode === teacherCode)          role = 'teacher'
  else if (inviteCode === taAdminCode)     role = 'ta_desk'
  else if (inviteCode === taAssistantCode) role = 'ta_assistant'
  else if (inviteCode === taCodeLegacy)    role = 'ta_desk'

  if (!role) {
    return { error: '유효하지 않은 초대 코드입니다.' }
  }

  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role },
    },
  })

  if (signUpError) {
    if (signUpError.message.includes('already registered')) {
      return { error: '이미 사용 중인 이메일입니다.' }
    }
    return { error: '회원가입 중 오류가 발생했습니다.' }
  }

  // public.users에 삽입해야 get_my_role()이 정상 작동하고 RLS 통과 가능
  if (signUpData.user) {
    await adminSupabase.from('users').insert({
      id:            signUpData.user.id,
      name,
      role,
      phone:         null,
      password_hash: 'managed_by_supabase_auth',
    })
  }

  redirect('/login?registered=1')
}

// ────────────────────────────────────────────────
// 로그아웃 — 수동 로그아웃과 무활동 자동 로그아웃 모두 이 함수를 거침
// ────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  const supabase = await createClient()

  // 스태프면 근무 상태를 오프라인으로 전환 (세션이 살아있을 때 먼저 처리)
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.user_metadata?.role as string | undefined
  if (user?.id && STAFF_ROLES.includes(role ?? '')) {
    await setStaffStatus(user.id, 'offline')
  }

  await supabase.auth.signOut()
  redirect('/login')
}
