import { headers } from 'next/headers'
import {
  USER_ID_HEADER,
  USER_EMAIL_HEADER,
  USER_ROLE_HEADER,
  USER_NAME_HEADER,
  USER_MUST_CHANGE_PASSWORD_HEADER,
  USER_AGREED_TERMS_AT_HEADER,
} from './trusted-user-headers'

export type VerifiedUser = {
  id: string
  email: string | null
  user_metadata: {
    role?: string
    name?: string
    must_change_password?: boolean
    agreed_terms_at?: string | null
  }
}

// proxy.ts가 이미 supabase.auth.getUser()로 검증해 헤더에 실어 보낸 유저 정보를 읽는다.
// 네트워크 호출 없이 헤더만 읽으므로, 레이아웃/페이지에서 매번 auth.getUser()를 다시 부를 필요가 없다.
export async function getVerifiedUser(): Promise<VerifiedUser | null> {
  const h = await headers()
  const id = h.get(USER_ID_HEADER)
  if (!id) return null

  const rawName = h.get(USER_NAME_HEADER)

  return {
    id,
    email: h.get(USER_EMAIL_HEADER),
    user_metadata: {
      role: h.get(USER_ROLE_HEADER) ?? undefined,
      name: rawName ? decodeURIComponent(rawName) : undefined,
      must_change_password: h.get(USER_MUST_CHANGE_PASSWORD_HEADER) === '1',
      agreed_terms_at: h.get(USER_AGREED_TERMS_AT_HEADER),
    },
  }
}
