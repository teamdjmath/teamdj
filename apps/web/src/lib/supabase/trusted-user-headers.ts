import type { User } from '@supabase/supabase-js'

// proxy.ts(미들웨어)가 supabase.auth.getUser()로 검증한 유저 정보를
// 레이아웃/페이지까지 요청 헤더로 전달하기 위한 이름들.
// 미들웨어에서만 설정되며, 매 요청마다 클라이언트가 보낸 동일 이름 헤더는 무조건 덮어쓴다.
export const USER_ID_HEADER = 'x-verified-user-id'
export const USER_EMAIL_HEADER = 'x-verified-user-email'
export const USER_ROLE_HEADER = 'x-verified-user-role'
export const USER_NAME_HEADER = 'x-verified-user-name'
export const USER_MUST_CHANGE_PASSWORD_HEADER = 'x-verified-user-must-change-password'
export const USER_AGREED_TERMS_AT_HEADER = 'x-verified-user-agreed-terms-at'

const ALL_TRUSTED_HEADERS = [
  USER_ID_HEADER,
  USER_EMAIL_HEADER,
  USER_ROLE_HEADER,
  USER_NAME_HEADER,
  USER_MUST_CHANGE_PASSWORD_HEADER,
  USER_AGREED_TERMS_AT_HEADER,
]

// headers에 검증된 유저 정보를 기록한다. 위조 방지를 위해 먼저 기존 값을 모두 지우고 시작한다.
export function setTrustedUserHeaders(headers: Headers, user: User | null): void {
  for (const name of ALL_TRUSTED_HEADERS) headers.delete(name)
  if (!user) return

  headers.set(USER_ID_HEADER, user.id)
  if (user.email) headers.set(USER_EMAIL_HEADER, user.email)

  const role = user.user_metadata?.role as string | undefined
  if (role) headers.set(USER_ROLE_HEADER, role)

  // 헤더 값은 ASCII(Latin-1)만 허용되므로 한글 등 비-ASCII 이름은 인코딩해서 전달
  const name = user.user_metadata?.name as string | undefined
  if (name) headers.set(USER_NAME_HEADER, encodeURIComponent(name))

  if (user.user_metadata?.must_change_password === true) {
    headers.set(USER_MUST_CHANGE_PASSWORD_HEADER, '1')
  }

  const agreedTermsAt = user.user_metadata?.agreed_terms_at as string | undefined
  if (agreedTermsAt) headers.set(USER_AGREED_TERMS_AT_HEADER, agreedTermsAt)
}
