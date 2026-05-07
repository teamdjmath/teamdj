import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// RLS 우회 + Auth Admin API 접근용 (서버 전용)
// SUPABASE_SECRET_KEY → Supabase 대시보드 Settings > API > service_role 키
// auth.admin.* 메서드는 service_role 권한이 필요. 환경변수가 없으면 즉시 crash.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  if (!url || !key) {
    throw new Error(
      '[createAdminClient] NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SECRET_KEY 환경변수가 설정되지 않았습니다.',
    )
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  })
}
