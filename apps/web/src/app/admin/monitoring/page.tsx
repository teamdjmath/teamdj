import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { MonitoringClient } from './_components/monitoring-client'
import type { HealthData } from '@/app/api/health/route'

export const dynamic = 'force-dynamic'

export default async function MonitoringPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.user_metadata?.role as string | undefined
  if (!user || !['teacher', 'ta_desk'].includes(role ?? '')) redirect('/admin/dashboard')

  const admin = createAdminClient()

  // 순수 ping — SELECT 1만 실행
  const pingStart = Date.now()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: pingErr } = await (admin as any).rpc('monitoring_ping')
  const responseMs = Date.now() - pingStart

  // cold start 감지: 첫 응답이 800ms 초과 시 재측정
  let finalMs = responseMs
  let coldStart = false
  if (responseMs > 800) {
    const s2 = Date.now()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).rpc('monitoring_ping')
    const ms2 = Date.now() - s2
    if (ms2 < responseMs * 0.5) {
      coldStart = true
      finalMs = ms2
    }
  }

  const [connResult, slowResult] = await Promise.allSettled([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).rpc('monitoring_connection_count'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).rpc('monitoring_slow_queries'),
  ])

  const connections =
    connResult.status === 'fulfilled' && connResult.value.data
      ? connResult.value.data
      : null

  const rawSlow = slowResult.status === 'fulfilled' ? slowResult.value : null
  const slowQueriesAvailable = rawSlow !== null && !rawSlow.error
  const slowQueries =
    slowQueriesAvailable && Array.isArray(rawSlow?.data) && rawSlow.data.length > 0
      ? rawSlow.data
      : slowQueriesAvailable ? [] : null

  const hasUrgent = (slowQueries ?? []).some((q: { mean_ms: number }) => q.mean_ms > 1000)
  const connStrain = connections ? connections.total / 200 > 0.75 : false
  const status: HealthData['status'] =
    !pingErr && finalMs < 400 && !hasUrgent && !connStrain ? 'ok'
    : !pingErr && finalMs < 1500 && !hasUrgent ? 'warn'
    : 'error'

  const initial: HealthData = {
    status,
    db: { responseMs: finalMs, ok: !pingErr, coldStart },
    connections,
    slowQueries,
    slowQueriesAvailable,
    checkedAt: new Date().toISOString(),
  }

  return <MonitoringClient initial={initial} />
}
