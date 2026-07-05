// pg_cron이 없는 환경 대비 lazy 보존 정리 — 조회 페이지 진입 시 호출.
// pg_cron이 동작 중이면 삭제 대상이 없어 사실상 no-op.
import { createAdminClient } from '@/lib/supabase/admin'

export async function purgeOldRows(
  table: 'audit_logs' | 'error_logs',
  days: number,
): Promise<void> {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from(table).delete().lt('created_at', cutoff)
}
