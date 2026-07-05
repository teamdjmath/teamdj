'use client'

import { useEffect, useState, useCallback, useTransition } from 'react'
import type { HealthData, SlowQuery } from '@/app/api/health/route'

const REFRESH_INTERVAL_MS = 30_000
const CONN_POOL_MAX = 200

// 쿼리 텍스트 → 한국어 맥락
function queryToKorean(query: string): string {
  const q = query.toLowerCase()
  if (q.includes('attendance')) return '출석 기록 조회'
  if (q.includes('assignment_progress')) return '과제 완료 현황 조회'
  if (q.includes('test_score')) return '시험 점수 조회'
  if (q.includes('qna_question') || q.includes('qna_answer')) return 'Q&A 질문/답변 조회'
  if (q.includes('notification')) return '알림 목록 조회'
  if (q.includes('report')) return '학습 리포트 조회'
  if (q.includes('lecture')) return '강의 영상 조회'
  if (q.includes('notice')) return '공지사항 조회'
  if (q.includes('class_member') || q.includes('class_group')) return '분반 정보 조회'
  if (q.includes('user')) return '학생/스태프 정보 조회'
  return '데이터 조회'
}

function msLabel(ms: number): { label: string; color: string } {
  if (ms < 100) return { label: '매우 빠름', color: 'text-green-600' }
  if (ms < 300) return { label: '정상', color: 'text-green-600' }
  if (ms < 600) return { label: '약간 느림', color: 'text-amber-600' }
  if (ms < 1500) return { label: '느림 — 확인 필요', color: 'text-amber-600' }
  return { label: '매우 느림 — 긴급 조치 필요', color: 'text-red-600' }
}

function connLabel(active: number, total: number): { label: string; color: string } {
  const ratio = total / CONN_POOL_MAX
  if (ratio < 0.5) return { label: '여유 있음', color: 'text-green-600' }
  if (ratio < 0.75) return { label: '보통', color: 'text-amber-600' }
  return { label: '포화 위험 — 긴급 조치 필요', color: 'text-red-600' }
}

function StatusBadge({ status }: { status: HealthData['status'] | 'loading' }) {
  const map = {
    ok:      { bg: 'bg-green-50 border-green-200', dot: 'bg-green-500', text: '시스템 정상 운영 중', sub: '응답 속도와 연결 수 모두 정상 범위입니다.' },
    warn:    { bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500', text: '주의 — 일부 항목 확인 필요', sub: '응답이 느려지거나 연결이 많아지고 있습니다. 아래 내용을 확인하세요.' },
    error:   { bg: 'bg-red-50 border-red-200',     dot: 'bg-red-500',   text: '긴급 — 즉시 점검 필요', sub: 'DB에 접근하지 못하거나 응답이 심각하게 느립니다. 개발자에게 바로 연락하세요.' },
    loading: { bg: 'bg-zinc-50 border-zinc-200',   dot: 'bg-zinc-400',  text: '확인 중...', sub: '데이터를 불러오고 있습니다.' },
  }
  const m = map[status]
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${m.bg}`}>
      <span className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${m.dot} ${status === 'loading' ? 'animate-pulse' : ''}`} />
      <div>
        <p className="font-semibold text-sm text-zinc-900">{m.text}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{m.sub}</p>
      </div>
    </div>
  )
}

function MetricCard({
  label, value, detail, detailColor, bar, barColor,
}: {
  label: string
  value: string
  detail: string
  detailColor: string
  bar?: number
  barColor?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-zinc-900 leading-none">{value}</p>
      <p className={`text-xs mt-1 font-medium ${detailColor}`}>{detail}</p>
      {bar !== undefined && (
        <div className="mt-3 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor ?? 'bg-green-500'}`}
            style={{ width: `${Math.min(bar * 100, 100).toFixed(1)}%` }}
          />
        </div>
      )}
    </div>
  )
}

function SlowQueryRow({ q, rank }: { q: SlowQuery; rank: number }) {
  const level = q.mean_ms > 1000 ? 'red' : q.mean_ms > 300 ? 'amber' : 'green'
  const levelStyle = {
    red:   { dot: 'bg-red-500',   badge: 'bg-red-50 text-red-700 border-red-200',   label: '긴급' },
    amber: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200', label: '주의' },
    green: { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200', label: '정상' },
  }[level]

  return (
    <div className="flex items-start gap-3 py-3 border-b border-zinc-100 last:border-0">
      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${levelStyle.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-semibold text-zinc-800">{queryToKorean(q.query)}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${levelStyle.badge}`}>{levelStyle.label}</span>
        </div>
        <p className="text-xs text-zinc-400 font-mono truncate">{q.query}</p>
        <div className="flex gap-4 mt-1.5 text-xs text-zinc-500">
          <span>평균 <strong className="text-zinc-800">{q.mean_ms.toFixed(0)}ms</strong></span>
          <span>호출 <strong className="text-zinc-800">{q.calls.toLocaleString()}회</strong></span>
          <span>반환 <strong className="text-zinc-800">{q.rows_per_call.toFixed(0)}건</strong></span>
        </div>
      </div>
      <span className="text-xs text-zinc-400 flex-shrink-0 mt-0.5">#{rank}</span>
    </div>
  )
}

function ActionItems({ data }: { data: HealthData }) {
  const items: Array<{ severity: 'red' | 'amber'; msg: string }> = []

  if (!data.db.ok) {
    items.push({ severity: 'red', msg: 'DB에 연결할 수 없습니다. Supabase 대시보드에서 서비스 상태를 확인하세요.' })
  } else if (data.db.responseMs > 1500) {
    items.push({ severity: 'red', msg: `DB 응답이 ${data.db.responseMs}ms로 심각하게 느립니다. Supabase Reports → Database에서 슬로우 쿼리를 확인하세요.` })
  } else if (data.db.responseMs > 500) {
    items.push({ severity: 'amber', msg: `DB 응답이 ${data.db.responseMs}ms입니다. 피크 타임에 더 느려질 수 있으니 아래 느린 쿼리를 먼저 개선하세요.` })
  }

  if (data.connections) {
    const ratio = data.connections.total / CONN_POOL_MAX
    if (ratio > 0.8) {
      items.push({ severity: 'red', msg: `DB 연결이 ${data.connections.total}개로 한계에 근접했습니다. Supabase 티어 업그레이드 또는 Connection Pooling 설정 확인이 필요합니다.` })
    } else if (ratio > 0.6) {
      items.push({ severity: 'amber', msg: `DB 연결이 ${data.connections.total}개입니다. 피크 타임 부하 테스트 전에 연결 수 여유를 확인하세요.` })
    }
    if (data.connections.waiting > 0) {
      items.push({ severity: 'amber', msg: `현재 ${data.connections.waiting}개의 쿼리가 대기 중입니다. DB 잠금(Lock) 경합이 생기고 있을 수 있습니다.` })
    }
  }

  const urgentSlows = data.slowQueries?.filter((q) => q.mean_ms > 1000) ?? []
  if (urgentSlows.length > 0) {
    items.push({ severity: 'red', msg: `${urgentSlows.length}개의 쿼리가 1초 이상 걸립니다. 인덱스 누락이 가장 흔한 원인입니다. 개발자에게 공유하세요.` })
  } else {
    const warnSlows = data.slowQueries?.filter((q) => q.mean_ms > 300) ?? []
    if (warnSlows.length > 0) {
      items.push({ severity: 'amber', msg: `${warnSlows.length}개의 쿼리가 300ms 이상 걸립니다. 데이터가 쌓일수록 더 느려질 수 있습니다.` })
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">지금 해야 할 일</p>
        <div className="flex items-center gap-2 text-sm text-green-700">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          현재 조치가 필요한 항목이 없습니다.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">지금 해야 할 일</p>
      </div>
      <div className="divide-y divide-zinc-100">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${item.severity === 'red' ? 'bg-red-500' : 'bg-amber-500'}`} />
            <p className="text-sm text-zinc-700 leading-relaxed">{item.msg}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 5) return '방금 전'
  if (diff < 60) return `${diff}초 전`
  return `${Math.floor(diff / 60)}분 전`
}

export function MonitoringClient({ initial }: { initial: HealthData | null }) {
  const [data, setData] = useState<HealthData | null>(initial)
  const [lastChecked, setLastChecked] = useState<string>(initial?.checkedAt ?? '')
  const [isPending, startTransition] = useTransition()
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_MS / 1000)

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        if (res.ok) {
          const d = (await res.json()) as HealthData
          setData(d)
          setLastChecked(d.checkedAt)
          setCountdown(REFRESH_INTERVAL_MS / 1000)
        }
      } catch {
        // 네트워크 오류는 무시 — 다음 주기에 재시도
      }
    })
  }, [])

  // 자동 새로고침
  useEffect(() => {
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refresh])

  // 카운트다운 표시
  useEffect(() => {
    const tick = setInterval(() => setCountdown((n) => (n > 1 ? n - 1 : REFRESH_INTERVAL_MS / 1000)), 1000)
    return () => clearInterval(tick)
  }, [lastChecked])

  const connRatio = data?.connections ? data.connections.total / CONN_POOL_MAX : 0
  const connBarColor =
    connRatio > 0.8 ? 'bg-red-500' : connRatio > 0.6 ? 'bg-amber-500' : 'bg-green-500'
  const connInfo = data?.connections
    ? connLabel(data.connections.active, data.connections.total)
    : { label: '—', color: 'text-zinc-400' }
  const dbInfo = data ? msLabel(data.db.responseMs) : { label: '—', color: 'text-zinc-400' }
  const slowCount = data?.slowQueries?.filter((q) => q.mean_ms > 300).length ?? 0

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">시스템 모니터링</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {lastChecked ? `마지막 확인: ${timeAgo(lastChecked)}` : '확인 중...'}
            {data && ` · ${countdown}초 후 자동 갱신`}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isPending ? '확인 중' : '지금 확인'}
        </button>
      </div>

      {/* 전체 상태 */}
      <StatusBadge status={data ? data.status : 'loading'} />

      {/* 핵심 지표 3개 */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="DB 응답 속도"
          value={data ? `${data.db.responseMs}ms` : '—'}
          detail={data ? dbInfo.label : '측정 중'}
          detailColor={data ? dbInfo.color : 'text-zinc-400'}
        />
        <MetricCard
          label="현재 DB 연결 수"
          value={data?.connections ? `${data.connections.total}개` : '—'}
          detail={data?.connections ? connInfo.label : '측정 중'}
          detailColor={data?.connections ? connInfo.color : 'text-zinc-400'}
          bar={connRatio}
          barColor={connBarColor}
        />
        <MetricCard
          label="느린 쿼리"
          value={data ? `${slowCount}개` : '—'}
          detail={
            !data ? '측정 중'
            : slowCount === 0 ? '모두 빠름'
            : slowCount < 3 ? '일부 주의'
            : '즉시 확인 필요'
          }
          detailColor={
            !data ? 'text-zinc-400'
            : slowCount === 0 ? 'text-green-600'
            : slowCount < 3 ? 'text-amber-600'
            : 'text-red-600'
          }
        />
      </div>

      {/* 해야 할 일 */}
      {data && <ActionItems data={data} />}

      {/* 느린 쿼리 상세 */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-zinc-100">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">느린 쿼리 분석</p>
          <p className="text-xs text-zinc-400 mt-0.5">어떤 기능의 데이터 조회가 오래 걸리는지 보여줍니다</p>
        </div>
        <div className="px-4">
          {!data && (
            <p className="py-6 text-sm text-zinc-400 text-center">데이터를 불러오는 중...</p>
          )}
          {data && (!data.slowQueries || data.slowQueries.length === 0) && (
            <div className="py-6 flex items-center gap-2 justify-center text-sm text-green-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              모든 쿼리가 빠르게 처리되고 있습니다.
            </div>
          )}
          {data?.slowQueries && data.slowQueries.length > 0 && (
            <div>
              {data.slowQueries.map((q, i) => (
                <SlowQueryRow key={i} q={q} rank={i + 1} />
              ))}
            </div>
          )}
          {data && !data.slowQueries && (
            <p className="py-4 text-sm text-zinc-400 text-center">
              pg_stat_statements 확장이 활성화되지 않아 쿼리 분석을 사용할 수 없습니다.<br />
              <span className="text-xs">Supabase 대시보드 → Database → Extensions → pg_stat_statements 활성화</span>
            </p>
          )}
        </div>
      </div>

      {/* 연결 상세 */}
      {data?.connections && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">DB 연결 상세</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '전체', value: data.connections.total, note: `/ ${CONN_POOL_MAX}개 한도` },
              { label: '활성', value: data.connections.active, note: '쿼리 실행 중' },
              { label: '대기', value: data.connections.idle, note: '유휴 상태' },
              { label: '잠금 대기', value: data.connections.waiting, note: '응답 지연 원인' },
            ].map(({ label, value, note }) => (
              <div key={label} className="text-center">
                <p className={`text-xl font-bold tabular-nums ${value > 0 && label === '잠금 대기' ? 'text-amber-600' : 'text-zinc-900'}`}>
                  {value}
                </p>
                <p className="text-xs font-semibold text-zinc-600">{label}</p>
                <p className="text-[10px] text-zinc-400">{note}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 h-2 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${connBarColor}`}
              style={{ width: `${Math.min(connRatio * 100, 100).toFixed(1)}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-400 mt-1 text-right">
            {(connRatio * 100).toFixed(0)}% 사용 중 ({data.connections.total} / {CONN_POOL_MAX})
          </p>
        </div>
      )}
    </div>
  )
}
