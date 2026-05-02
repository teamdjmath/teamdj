'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AuthState = {
  error: string | null
}

// ────────────────────────────────────────────────
// 로그인
// role: 'student' | 'parent' → 전화번호를 이메일 형식으로 변환
// role: 'teacher' | 'ta'    → 이메일 그대로 사용
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

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
  }

  // 로그인 성공 — 역할에 따라 리다이렉트 (proxy.ts 가 처리하지만 명시적으로도 수행)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.user_metadata?.role as string | undefined
  const dest =
    role === 'teacher' || role === 'ta' ? '/admin/dashboard' : '/dashboard'

  redirect(dest)
}

// ────────────────────────────────────────────────
// 회원가입 (선생님 / 조교 전용 — 초대 코드 검증)
// ────────────────────────────────────────────────
export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name       = (formData.get('name') as string).trim()
  const email      = (formData.get('email') as string).trim()
  const password   = formData.get('password') as string
  const inviteCode = (formData.get('inviteCode') as string).trim()

  // 초대 코드로 역할 결정
  const teacherCode = process.env.TEACHER_INVITE_CODE
  const taCode      = process.env.TA_INVITE_CODE

  let role: 'teacher' | 'ta' | null = null
  if (inviteCode === teacherCode) role = 'teacher'
  else if (inviteCode === taCode)  role = 'ta'

  if (!role) {
    return { error: '유효하지 않은 초대 코드입니다.' }
  }

  const supabase = await createClient()

  const { error: signUpError } = await supabase.auth.signUp({
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

  redirect('/login?registered=1')
}

// ────────────────────────────────────────────────
// 로그아웃
// ────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
