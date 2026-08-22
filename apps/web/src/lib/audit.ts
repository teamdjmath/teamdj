import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export type AuditEntry = {
  action: string        // 예: 'student.create', 'report.delete_session'
  targetType: string    // 예: 'student', 'report', 'message'
  targetId?: string
  targetLabel?: string  // 사람이 읽는 대상 이름
  detail?: Record<string, unknown>
}

type AuditActor = { id: string; user_metadata?: { name?: string; role?: string } }

// 감사 로그 기록 — 실패해도 원래 액션을 막지 않는다 (fire-and-forget)
export async function logAudit(actor: AuditActor, entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient()
    // actor.user_metadata는 세션 발급 시점의 스냅샷이라 이름이 바뀌어도 재로그인 전까지 옛 이름을
    // 계속 들고 있다 — 감사 로그에는 항상 users 테이블의 현재 이름을 조회해 기록한다.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: liveActor } = await (admin as any).from('users').select('name, role').eq('id', actor.id).maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from('audit_logs').insert({
      actor_id:     actor.id,
      actor_name:   (liveActor?.name as string | undefined) ?? (actor.user_metadata?.name as string | undefined) ?? '',
      actor_role:   (liveActor?.role as string | undefined) ?? (actor.user_metadata?.role as string | undefined) ?? '',
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
