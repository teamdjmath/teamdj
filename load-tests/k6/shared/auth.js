import http from 'k6/http'

const SUPABASE_URL = __ENV.SUPABASE_URL
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY

/**
 * 이메일 또는 전화번호로 Supabase 로그인 → access_token 반환
 * 학생: 전화번호(01012345678) → 01012345678@teamdj.com 자동 변환
 * 실패 시 null 반환 (테스트는 계속)
 */
export function login(emailOrPhone, password) {
  const email = /^\d+$/.test(emailOrPhone.replace(/-/g, ''))
    ? `${emailOrPhone.replace(/\D/g, '')}@teamdj.com`
    : emailOrPhone

  const res = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      tags: { name: 'auth_login' },
    }
  )

  if (res.status !== 200) return null
  const body = JSON.parse(res.body)
  return body.access_token ?? null
}

/**
 * Bearer 헤더 포함 공통 헤더
 * - /api/* 엔드포인트: Authorization 헤더로 인증
 * - 페이지(SSR): 쿠키 없이는 /login 리다이렉트 → k6가 따라가서 200
 */
export function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'text/html,application/json',
  }
}
