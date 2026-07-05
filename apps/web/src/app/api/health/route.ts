import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

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
    coldStart: boolean  // 첫 요청 warm-up 가능성 플래그
  }
  connections: ConnectionCount | null
  slowQueries: SlowQuery[] | null       // 앱 쿼리만 (시스템 쿼리 제외)
  slowQueriesAvailable: boolean         // pg_stat_statements 활성 여부
  checkedAt: string
}

export async function GET(request: NextRequest): Promise<NextResponse<HealthData | { error: string }>> {
  const admin = createAdminClient()

  // 쿠키 세션 우선, Bearer 토큰 fallback (k6 등 API 클라이언트용)
  let user: { user_metadata?: { role?: string } } | null = null
  const bearerToken = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (bearerToken) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any).auth.getUser(bearerToken)
    user = data?.user ?? null
  } else {
    const client = await createClient()
    const { data } = await client.auth.getUser()
    user = data?.user ?? null
  }

  const role = user?.user_metadata?.role as string | undefined
  if (!user || !['teacher', 'ta_desk'].includes(role ?? '')) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  // 1. 순수 DB 연결 왕복 시간 (SELECT 1 — 테이블 스캔 없음)
  const pingStart = Date.now()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: pingErr } = await (admin as any).rpc('monitoring_ping')
  const responseMs = Date.now() - pingStart

  // Supabase 무료 플랜 cold start: 최초 요청 시 1~2s 소요 가능
  // 두 번째 측정으로 실제 응답시간 확인
  let responseMs2 = responseMs
  if (responseMs > 800) {
    const start2 = Date.now()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).rpc('monitoring_ping')
    responseMs2 = Date.now() - start2
  }
  const isColdStart = responseMs > 800 && responseMs2 < responseMs * 0.5

  // 2. 연결 수 + 느린 앱 쿼리 병렬 조회
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

  const rawSlow = slowResult.status === 'fulfilled' ? slowResult.value : null
  const slowQueriesAvailable = rawSlow !== null && !rawSlow.error
  const slowQueries: SlowQuery[] | null =
    slowQueriesAvailable && Array.isArray(rawSlow?.data) && rawSlow.data.length > 0
      ? (rawSlow.data as SlowQuery[])
      : slowQueriesAvailable ? [] : null

  // 3. 상태 판정 (cold start는 warn으로 낮춤)
  const effectiveMs = isColdStart ? responseMs2 : responseMs
  const hasUrgentQuery = slowQueries?.some((q) => q.mean_ms > 1000) ?? false
  const connectionStrain = connections ? connections.total / 200 > 0.75 : false

  const status: HealthStatus =
    !pingErr && effectiveMs < 400 && !hasUrgentQuery && !connectionStrain
      ? 'ok'
      : !pingErr && effectiveMs < 1500 && !hasUrgentQuery
        ? 'warn'
        : 'error'

  const payload: HealthData = {
    status,
    db: { responseMs: isColdStart ? responseMs2 : responseMs, ok: !pingErr, coldStart: isColdStart },
    connections,
    slowQueries,
    slowQueriesAvailable,
    checkedAt: new Date().toISOString(),
  }

  return NextResponse.json(payload)
}
