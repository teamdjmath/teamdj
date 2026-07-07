import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { estimateCostKrw } from '@/lib/ai-pricing'
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { MonitoringClient, type BehaviorStats, type AiUsageStats } from './_components/monitoring-client'

export const dynamic = 'force-dynamic'

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
    const [rpcRes, aiUsage] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).rpc('monitoring_behavior_stats') as Promise<{ data: unknown; error: unknown }>,
      getAiUsageStats(admin),
    ])
    return {
      stats: rpcRes.error ? null : (rpcRes.data as BehaviorStats),
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
