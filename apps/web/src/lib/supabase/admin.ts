import { createClient } from '@supabase/supabase-js'

// RLS 우회 + Auth Admin API 접근용 (서버 전용)
// SUPABASE_SECRET_KEY (service_role key) 필요
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
