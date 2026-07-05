import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// RLS 우회 + Auth Admin API 접근용 (서버 전용)
// SUPABASE_SECRET_KEY → Supabase 대시보드 Settings > API > service_role 키
// auth.admin.* 메서드는 service_role 권한이 필요. 환경변수가 없으면 즉시 crash.

// 람다 인스턴스당 클라이언트 1개 재사용 (Supavisor connection 절약)
let _adminClient: SupabaseClient<Database> | null = null

export function createAdminClient(): SupabaseClient<Database> {
  if (_adminClient) return _adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  if (!url || !key) {
    throw new Error(
      '[createAdminClient] NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SECRET_KEY 환경변수가 설정되지 않았습니다.',
    )
  }

  _adminClient = createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  })
  return _adminClient
}
