import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { estimateCostKrw } from '@/lib/ai-pricing'
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { MonitoringClient, type BehaviorStats, type AiUsageStats } from './_components/monitoring-client'

export const dynamic = 'force-dynamic'

// 최근 7일 로그인 성공/실패 — auth.audit_log_entries는 이 Supabase 버전에서 항상 비어있어
// (인증 이벤트를 DB에 기록하지 않음), signIn 액션이 직접 남기는 audit_logs를 센다.
async function getLogin7d(admin: ReturnType<typeof createAdminClient>): Promise<{ success: number; failed: number }> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  const [successRes, failedRes] = await Promise.all([
    db.from('audit_logs').select('id', { count: 'exact', head: true }).eq('action', 'auth.login').gte('created_at', weekAgo),
    db.from('audit_logs').select('id', { count: 'exact', head: true }).eq('action', 'auth.login_failed').gte('created_at', weekAgo),
  ])
  return { success: successRes.count ?? 0, failed: failedRes.count ?? 0 }
}

// 이번 달 AI 호출량·토큰·예상 요금 집계
async function getAiUsageStats(admin: ReturnType<typeof createAdminClient>): Promise<AiUsageStats | null> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data, error } = await admin
    .from('ai_usage_logs')
    .select('mode, prompt_tokens, thoughts_tokens, output_tokens')
    .gte('created_at', monthStart)

  if (error) return null

  let hintCalls = 0, fullCalls = 0, totalTokens = 0, costKrw = 0
  let hintCostKrw = 0, fullCostKrw = 0

  for (const row of data ?? []) {
    const cost = estimateCostKrw(row.prompt_tokens, row.thoughts_tokens, row.output_tokens)
    totalTokens += row.prompt_tokens + row.thoughts_tokens + row.output_tokens
    costKrw += cost
    if (row.mode === 'full') { fullCalls++; fullCostKrw += cost }
    else { hintCalls++; hintCostKrw += cost }
  }

  return {
    calls: hintCalls + fullCalls,
    hintCalls,
    fullCalls,
    totalTokens,
    costKrw,
    avgHintKrw: hintCalls > 0 ? hintCostKrw / hintCalls : null,
    avgFullKrw: fullCalls > 0 ? fullCostKrw / fullCalls : null,
  }
}

// 집계 쿼리 5분 캐시 — 실시간성이 필요 없는 지표라 매 진입마다 재집계하지 않음
const getBehaviorStats = unstable_cache(
  async (): Promise<{ stats: BehaviorStats | null; aiUsage: AiUsageStats | null; checkedAt: string }> => {
    const admin = createAdminClient()
    const [rpcRes, aiUsage, login7d] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).rpc('monitoring_behavior_stats') as Promise<{ data: unknown; error: unknown }>,
      getAiUsageStats(admin),
      getLogin7d(admin),
    ])
    const stats = rpcRes.error ? null : (rpcRes.data as BehaviorStats)
    // RPC의 login_7d(auth.audit_log_entries 기반, 항상 0)를 자체 기록으로 교체
    if (stats) stats.login_7d = login7d
    return {
      stats,
      aiUsage,
      checkedAt: new Date().toISOString(),
    }
  },
  ['monitoring-behavior-stats'],
  { revalidate: 300 },
)

export default async function MonitoringPage() {
  const user = await getVerifiedUser()
  const role = user?.user_metadata?.role as string | undefined
  if (!user || !['teacher', 'ta_desk'].includes(role ?? '')) redirect('/admin/dashboard')

  const { stats, aiUsage, checkedAt } = await getBehaviorStats()

  return <MonitoringClient stats={stats} aiUsage={aiUsage} checkedAt={checkedAt} />
}
