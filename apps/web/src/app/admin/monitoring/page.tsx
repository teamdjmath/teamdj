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
  if (!user || !['teacher', 'ta_admin'].includes(role ?? '')) redirect('/admin/dashboard')

  const admin = createAdminClient()

  // 초기 데이터 — 서버에서 미리 가져와 SSR
  const pingStart = Date.now()
  const { error: pingErr } = await admin.from('users').select('id').limit(1)
  const responseMs = Date.now() - pingStart

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

  const slowQueries =
    slowResult.status === 'fulfilled' && Array.isArray(slowResult.value.data)
      ? slowResult.value.data
      : null

  const hasSlowQuery = slowQueries?.some((q: { mean_ms: number }) => q.mean_ms > 500) ?? false
  const connectionStrain = connections ? connections.total / 200 > 0.7 : false
  const status: HealthData['status'] =
    !pingErr && responseMs < 300 && !hasSlowQuery && !connectionStrain ? 'ok'
    : !pingErr && responseMs < 1500 ? 'warn'
    : 'error'

  const initial: HealthData = {
    status,
    db: { responseMs, ok: !pingErr },
    connections,
    slowQueries,
    checkedAt: new Date().toISOString(),
  }

  return <MonitoringClient initial={initial} />
}
