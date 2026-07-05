import http from 'k6/http'

const SUPABASE_URL = __ENV.SUPABASE_URL
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY

/**
 * Supabase 이메일/비밀번호 로그인 → access_token 반환
 * 실패 시 null 반환 (테스트는 계속)
 */
export function login(email, password) {
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

/** Bearer 헤더 + Cookie를 포함한 공통 헤더 */
export function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Cookie: `sb-access-token=${token}`,
    Accept: 'text/html,application/json',
  }
}
