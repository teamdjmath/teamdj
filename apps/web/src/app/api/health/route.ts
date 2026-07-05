import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export type SlowQuery = {
  query: string
  calls: number
  mean_ms: number
  total_ms: number
  rows_per_call: number
}

export type ConnectionCount = {
  total: number
  active: number
  idle: number
  waiting: number
}

export type HealthStatus = 'ok' | 'warn' | 'error'

export type HealthData = {
  status: HealthStatus
  db: {
    responseMs: number
    ok: boolean
  }
  connections: ConnectionCount | null
  slowQueries: SlowQuery[] | null
  checkedAt: string
}

export async function GET(): Promise<NextResponse<HealthData | { error: string }>> {
  // admin only
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  const role = user?.user_metadata?.role as string | undefined
  if (!user || !['teacher', 'ta_admin'].includes(role ?? '')) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const admin = createAdminClient()

  // 1. DB ping (users 테이블에서 1건 조회 — 실제 RLS 경로 측정)
  const pingStart = Date.now()
  const { error: pingErr } = await admin.from('users').select('id').limit(1)
  const responseMs = Date.now() - pingStart

  // 2. 연결 수, 느린 쿼리 병렬 조회
  const [connResult, slowResult] = await Promise.allSettled([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).rpc('monitoring_connection_count'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).rpc('monitoring_slow_queries'),
  ])

  const connections: ConnectionCount | null =
    connResult.status === 'fulfilled' && connResult.value.data
      ? (connResult.value.data as ConnectionCount)
      : null

  const slowQueries: SlowQuery[] | null =
    slowResult.status === 'fulfilled' && Array.isArray(slowResult.value.data)
      ? (slowResult.value.data as SlowQuery[])
      : null

  // 3. 상태 판정
  const hasSlowQuery = slowQueries?.some((q) => q.mean_ms > 500) ?? false
  const connectionStrain = connections ? connections.active / 200 > 0.7 : false

  const status: HealthStatus =
    !pingErr && responseMs < 300 && !hasSlowQuery && !connectionStrain
      ? 'ok'
      : !pingErr && responseMs < 1500
        ? 'warn'
        : 'error'

  const payload: HealthData = {
    status,
    db: { responseMs, ok: !pingErr },
    connections,
    slowQueries,
    checkedAt: new Date().toISOString(),
  }

  return NextResponse.json(payload)
}
