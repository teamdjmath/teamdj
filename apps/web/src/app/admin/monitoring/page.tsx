import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { MonitoringClient, type BehaviorStats } from './_components/monitoring-client'

export const dynamic = 'force-dynamic'

// 집계 쿼리 5분 캐시 — 실시간성이 필요 없는 지표라 매 진입마다 재집계하지 않음
const getBehaviorStats = unstable_cache(
  async (): Promise<{ stats: BehaviorStats | null; checkedAt: string }> => {
    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any).rpc('monitoring_behavior_stats')
    return {
      stats: error ? null : (data as BehaviorStats),
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

  const { stats, checkedAt } = await getBehaviorStats()

  return <MonitoringClient stats={stats} checkedAt={checkedAt} />
}
