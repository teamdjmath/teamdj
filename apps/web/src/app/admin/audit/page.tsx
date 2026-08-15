import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { redirect } from 'next/navigation'
import { purgeOldRows } from '@/lib/retention'
import { AuditClient, type AuditRow } from './_components/audit-client'

export const dynamic = 'force-dynamic'

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>
}) {
  const { action: actionFilter } = await searchParams

  const user = await getVerifiedUser()
  const role = user?.user_metadata?.role as string | undefined
  if (!user || role !== 'teacher') redirect('/admin/dashboard')

  const admin = createAdminClient()

  // 보존 정책 lazy 정리 — pg_cron이 없는 환경 대비 (있으면 삭제 대상이 없어 no-op)
  await purgeOldRows('audit_logs', 90)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any).from('audit_logs')
    .select('id, actor_name, actor_role, action, target_type, target_label, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (actionFilter === 'auth.login_all') {
    // "로그인 기록" 필터를 직접 선택했을 때만 성공/실패 둘 다 보여준다
    query = query.in('action', ['auth.login', 'auth.login_failed'])
  } else if (actionFilter) {
    query = query.eq('action', actionFilter)
  } else {
    // 기본("전체") 보기에서는 로그인 성공/실패가 건수가 압도적으로 많아 다른 감사 기록을 다 덮어버림 —
    // 모니터링의 "로그인 7일" 집계는 이 테이블을 그대로 쓰므로 기록 자체는 유지하고 전체 목록에서만 제외
    query = query.not('action', 'in', '(auth.login,auth.login_failed)')
  }

  const { data: rows } = await query

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logs: AuditRow[] = (rows ?? []).map((r: any) => ({
    id:          r.id          as string,
    actorName:   r.actor_name  as string,
    actorRole:   r.actor_role  as string,
    action:      r.action      as string,
    targetType:  r.target_type as string,
    targetLabel: r.target_label as string,
    detail:      (r.detail ?? null) as Record<string, unknown> | null,
    createdAt:   r.created_at  as string,
  }))

  return <AuditClient logs={logs} actionFilter={actionFilter ?? null} />
}
