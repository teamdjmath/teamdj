// 서버 전용 — 서버 액션에서만 import할 것
import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export type AuditEntry = {
  action: string        // 예: 'student.create', 'report.delete_session'
  targetType: string    // 예: 'student', 'report', 'message'
  targetId?: string
  targetLabel?: string  // 사람이 읽는 대상 이름
  detail?: Record<string, unknown>
}

// 감사 로그 기록 — 실패해도 원래 액션을 막지 않는다 (fire-and-forget)
export async function logAudit(actor: User, entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from('audit_logs').insert({
      actor_id:     actor.id,
      actor_name:   (actor.user_metadata?.name as string | undefined) ?? '',
      actor_role:   (actor.user_metadata?.role as string | undefined) ?? '',
      action:       entry.action,
      target_type:  entry.targetType,
      target_id:    entry.targetId ?? '',
      target_label: entry.targetLabel ?? '',
      detail:       entry.detail ?? null,
    })
    if (error) logger.warn('logAudit:insert-failed', { action: entry.action, userId: actor.id, error })
  } catch (e) {
    logger.warn('logAudit:error', { action: entry.action, userId: actor.id, error: e })
  }
}
