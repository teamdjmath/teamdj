'use client'

import { useEffect, useState, useCallback, useTransition } from 'react'
import type { HealthData, SlowQuery } from '@/app/api/health/route'

const REFRESH_INTERVAL_MS = 30_000
const CONN_POOL_MAX = 200

// ── 앱 테이블 → 한국어 기능명 ──────────────────────────────
const TABLE_LABEL_MAP: Record<string, string> = {
  attendance_logs: '출석 기록',
  assignment_progress: '과제 완료 현황',
  assignment_categories: '과제 카테고리',
  assignments: '과제',
  test_scores: '시험 점수',
  exam_results: '특별 시험 결과',
  tests: '시험',
  qna_questions: 'Q&A 질문',
  qna_answers: 'Q&A 답변',
  notifications: '알림',
  reports: '학습 리포트',
  lectures: '강의 영상',
  lecture_class_access: '강좌 접근 권한',
  course_materials: '강좌 학습 자료',
  notices: '공지사항',
  class_members: '분반 수강생',
  class_groups: '분반',
  users: '학생/스태프 정보',
  push_messages: '쪽지',
  student_todos: '학습 투두',
  textbooks: '교재',
  consultations: '상담 신청',
  parent_links: '학부모 연결',
  extra_schedules: '추가 근무 일정',
  staff_status: '스태프 근무 상태',
}

function queryToKorean(query: string): { label: string; tables: string[] } {
  const lower = query.toLowerCase()
  const matched: string[] = []
  for (const [table, label] of Object.entries(TABLE_LABEL_MAP)) {
    if (lower.includes(table)) matched.push(label)
  }
  if (matched.length === 0) return { label: '데이터 조회', tables: [] }
  if (matched.length === 1) return { label: `${matched[0]} 조회`, tables: matched }
  return { label: `${matched[0]} 외 ${matched.length - 1}개 조회`, tables: matched }
}

// ── 상태 판정 헬퍼 ──────────────────────────────────────────
function dbSpeedInfo(ms: number, coldStart: boolean): { label: string; color: string; hint: string } {
  if (coldStart) return {
    label: '일시적 지연 (정상)',
    color: 'text-amber-600',
    hint: 'DB가 비활성 상태에서 깨어나는 데 1~2초가 걸렸습니다. 30초 후 다시 확인하세요.',
  }
  if (ms < 150) return { label: '매우 빠름', color: 'text-green-600', hint: '모든 학생의 요청을 즉시 처리할 수 있습니다.' }
  if (ms < 400) return { label: '정상', color: 'text-green-600', hint: '정상 범위입니다.' }
  if (ms < 800) return { label: '약간 느림', color: 'text-amber-600', hint: '피크 타임에 더 느려질 수 있습니다. 아래 느린 쿼리를 확인하세요.' }
  return { label: '느림 — 확인 필요', color: 'text-red-600', hint: '학생들이 페이지 로딩이 느리다고 느낄 수 있습니다. 개발자에게 공유하세요.' }
}

function connInfo(total: number): { label: string; color: string; hint: string } {
  const ratio = total / CONN_POOL_MAX
  if (ratio < 0.4) return { label: '여유 있음', color: 'text-green-600', hint: '동시 접속자가 늘어도 충분히 처리할 수 있습니다.' }
  if (ratio < 0.7) return { label: '보통', color: 'text-amber-600', hint: '정상 범위지만 피크 타임에 모니터링이 필요합니다.' }
  return { label: '포화 위험', color: 'text-red-600', hint: '연결이 꽉 차면 학생이 "오류" 화면을 보게 됩니다. 즉시 조치가 필요합니다.' }
}

function slowCount(queries: SlowQuery[]): { label: string; color: string } {
  const urgent = queries.filter((q) => q.mean_ms > 1000).length
  const warn = queries.filter((q) => q.mean_ms > 300 && q.mean_ms <= 1000).length
  if (urgent > 0) return { label: `${urgent}개 긴급`, color: 'text-red-600' }
  if (warn > 0) return { label: `${warn}개 주의`, color: 'text-amber-600' }
  if (queries.length === 0) return { label: '없음', color: 'text-green-600' }
  return { label: `${queries.length}개 정상`, color: 'text-green-600' }
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 5) return '방금 전'
  if (diff < 60) return `${diff}초 전`
  return `${Math.floor(diff / 60)}분 전`
}

// ── 개발자에게 공유할 텍스트 생성 ──────────────────────────
function buildShareText(data: HealthData): string {
  const lines: string[] = [
    '━━━ TeamDJ 시스템 진단 리포트 ━━━',
    `생성 일시: ${new Date(data.checkedAt).toLocaleString('ko-KR')}`,
    `전체 상태: ${data.status === 'ok' ? '✅ 정상' : data.status === 'warn' ? '⚠️ 주의' : '🚨 긴급'}`,
    '',
    `[DB 응답 속도]`,
    `  ${data.db.responseMs}ms  ${data.db.coldStart ? '(cold start 감지 — 실제 응답은 더 빠를 수 있음)' : ''}`,
    '',
  ]
  if (data.connections) {
    lines.push('[DB 연결 현황]')
    lines.push(`  전체: ${data.connections.total} / ${CONN_POOL_MAX}`)
    lines.push(`  활성: ${data.connections.active}  유휴: ${data.connections.idle}  잠금 대기: ${data.connections.waiting}`)
    lines.push('')
  }
  if (data.slowQueries && data.slowQueries.length > 0) {
    lines.push('[느린 앱 쿼리 (상위 10개)]')
    data.slowQueries.forEach((q, i) => {
      const { label } = queryToKorean(q.query)
      lines.push(`  ${i + 1}. ${label}  평균 ${q.mean_ms.toFixed(0)}ms  ${q.calls}회 호출`)
      lines.push(`     ${q.query.trim().replace(/\s+/g, ' ')}`)
    })
  } else if (data.slowQueriesAvailable) {
    lines.push('[느린 앱 쿼리]')
    lines.push('  없음 — 모든 앱 쿼리 정상')
  } else {
    lines.push('[느린 앱 쿼리]')
    lines.push('  pg_stat_statements 미활성 — Supabase Extensions에서 활성화 필요')
  }
  lines.push('')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  return lines.join('\n')
}

// ── 컴포넌트 ────────────────────────────────────────────────

function StatusBanner({ status, coldStart }: { status: HealthData['status'] | 'loading'; coldStart?: boolean }) {
  const map = {
    ok:    { bg:'bg-green-50 border-green-200', dot:'bg-green-500', title:'시스템 정상 운영 중', sub:'응답 속도, DB 연결, 쿼리 모두 정상 범위입니다.' },
    warn:  { bg:'bg-amber-50 border-amber-200', dot:'bg-amber-400 animate-pulse', title:'주의 — 일부 항목 확인 필요', sub: coldStart ? 'DB가 비활성 상태에서 막 깨어났습니다. 30초 후 다시 확인하세요.' : '응답이 느려지거나 확인이 필요한 항목이 있습니다. 아래 내용을 검토하세요.' },
    error: { bg:'bg-red-50 border-red-200',    dot:'bg-red-500 animate-pulse',   title:'긴급 — 즉시 점검 필요',     sub:'DB 접근 불가 또는 응답이 심각하게 느립니다. 지금 바로 개발자에게 연락하세요.' },
    loading:{ bg:'bg-zinc-50 border-zinc-200', dot:'bg-zinc-300 animate-pulse',  title:'확인 중...',                sub:'데이터를 불러오고 있습니다.' },
  }
  const m = map[status]
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${m.bg}`}>
      <span className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${m.dot}`} />
      <div>
        <p className="font-semibold text-sm text-zinc-900">{m.title}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{m.sub}</p>
      </div>
    </div>
  )
}

function MetricCard({ label, value, detail, detailColor, hint, bar, barColor }: {
  label: string; value: string; detail: string; detailColor: string
  hint?: string; bar?: number; barColor?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 group relative">
      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-zinc-900 leading-none">{value}</p>
      <p className={`text-xs mt-1 font-medium ${detailColor}`}>{detail}</p>
      {bar !== undefined && (
        <div className="mt-3 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor ?? 'bg-green-500'}`}
            style={{ width: `${Math.min(bar * 100, 100).toFixed(1)}%` }} />
        </div>
      )}
      {hint && (
        <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed border-t border-zinc-100 pt-2">{hint}</p>
      )}
    </div>
  )
}

function ActionPanel({ data }: { data: HealthData }) {
  const items: Array<{ sev: 'red' | 'amber'; msg: string }> = []

  if (!data.db.ok) {
    items.push({ sev: 'red', msg: 'DB에 연결할 수 없습니다. Supabase 대시보드에서 서비스 상태를 먼저 확인하세요.' })
  } else if (data.db.coldStart) {
    items.push({ sev: 'amber', msg: 'DB가 비활성 상태에서 깨어났습니다. 30초 후 다시 새로고침하면 정확한 응답 속도를 볼 수 있습니다.' })
  } else if (data.db.responseMs > 800) {
    items.push({ sev: 'red', msg: `DB 응답이 ${data.db.responseMs}ms로 느립니다. 아래 느린 쿼리 목록을 개발자에게 공유하세요.` })
  } else if (data.db.responseMs > 400) {
    items.push({ sev: 'amber', msg: `DB 응답이 ${data.db.responseMs}ms입니다. 학생이 많이 접속하는 피크 타임에 더 느려질 수 있습니다.` })
  }

  if (data.connections) {
    const ratio = data.connections.total / CONN_POOL_MAX
    if (ratio > 0.8) {
      items.push({ sev: 'red', msg: `DB 연결이 ${data.connections.total}개로 한계에 근접했습니다. Supabase 플랜 업그레이드 또는 Connection Pool 설정 검토가 필요합니다.` })
    } else if (ratio > 0.6) {
      items.push({ sev: 'amber', msg: `DB 연결이 ${data.connections.total}개입니다. 부하 테스트 전에 확인이 필요합니다.` })
    }
    if (data.connections.waiting > 2) {
      items.push({ sev: 'amber', msg: `${data.connections.waiting}개 쿼리가 DB 잠금(Lock)을 기다리고 있습니다. 특정 기능에서 데이터 충돌이 발생하고 있을 수 있습니다.` })
    }
  }

  if (data.slowQueries) {
    const urgent = data.slowQueries.filter((q) => q.mean_ms > 1000)
    const warn   = data.slowQueries.filter((q) => q.mean_ms > 300 && q.mean_ms <= 1000)
    if (urgent.length > 0) {
      const names = urgent.slice(0, 2).map((q) => queryToKorean(q.query).label).join(', ')
      items.push({ sev: 'red', msg: `${urgent.length}개 기능의 DB 조회가 1초 이상 걸립니다 (${names}). 데이터가 쌓일수록 더 느려집니다. 인덱스 추가가 필요할 수 있습니다.` })
    } else if (warn.length > 0) {
      items.push({ sev: 'amber', msg: `${warn.length}개 기능의 DB 조회가 300ms 이상 걸립니다. 현재는 괜찮지만 학생 수가 늘면 문제가 될 수 있습니다.` })
    }
  }

  if (!data.slowQueriesAvailable) {
    items.push({ sev: 'amber', msg: 'pg_stat_statements 확장이 꺼져 있어 쿼리 분석을 사용할 수 없습니다. Supabase → Database → Extensions에서 활성화하세요.' })
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">지금 해야 할 일</p>
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
      <div className="px-4 pt-4 pb-1">
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">지금 해야 할 일</p>
      </div>
      <div className="divide-y divide-zinc-100">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${item.sev === 'red' ? 'bg-red-500' : 'bg-amber-400'}`} />
            <p className="text-sm text-zinc-700 leading-relaxed">{item.msg}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SlowQueryRow({ q, rank }: { q: SlowQuery; rank: number }) {
  const [open, setOpen] = useState(false)
  const { label, tables } = queryToKorean(q.query)
  const level = q.mean_ms > 1000 ? 'red' : q.mean_ms > 300 ? 'amber' : 'green'
  const ls = {
    red:   { dot:'bg-red-500',   badge:'bg-red-50 text-red-700 border-red-200',     tag:'긴급', bar:'bg-red-400' },
    amber: { dot:'bg-amber-500', badge:'bg-amber-50 text-amber-700 border-amber-200', tag:'주의', bar:'bg-amber-400' },
    green: { dot:'bg-green-500', badge:'bg-green-50 text-green-700 border-green-200', tag:'정상', bar:'bg-green-400' },
  }[level]

  const barW = Math.min((q.mean_ms / 1500) * 100, 100)

  return (
    <div className="py-3 border-b border-zinc-100 last:border-0">
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${ls.dot}`} />
        <div className="flex-1 min-w-0">
          {/* 비전공자용 요약 */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-zinc-800">{label}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${ls.badge}`}>{ls.tag}</span>
            {tables.map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">{t}</span>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500 mb-2">
            <span>평균 <strong className="text-zinc-800 tabular-nums">{q.mean_ms.toFixed(0)}ms</strong></span>
            <span>호출 <strong className="text-zinc-800 tabular-nums">{q.calls.toLocaleString()}회</strong></span>
            <span>반환 <strong className="text-zinc-800 tabular-nums">{q.rows_per_call.toFixed(0)}건</strong></span>
          </div>
          {/* 응답시간 바 */}
          <div className="h-1 rounded-full bg-zinc-100 overflow-hidden mb-2">
            <div className={`h-full rounded-full ${ls.bar}`} style={{ width: `${barW}%` }} />
          </div>
          {/* 개발자용 토글 */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            개발자용 상세
          </button>
          {open && (
            <div className="mt-2 rounded-lg bg-zinc-950 p-3 font-mono text-[11px] text-zinc-300 leading-relaxed overflow-x-auto">
              <div className="text-zinc-500 mb-1 font-sans text-[10px] uppercase tracking-wide">실제 쿼리</div>
              {q.query}
              <div className="mt-3 flex gap-4 text-zinc-500 font-sans text-[10px]">
                <span>평균 {q.mean_ms.toFixed(1)}ms</span>
                <span>총 {(q.total_ms / 1000).toFixed(1)}s</span>
                <span>{q.calls}회 호출</span>
                <span>회당 {q.rows_per_call.toFixed(1)}행</span>
              </div>
            </div>
          )}
        </div>
        <span className="text-xs text-zinc-400 flex-shrink-0 mt-0.5 tabular-nums">#{rank}</span>
      </div>
    </div>
  )
}

function ShareButton({ data }: { data: HealthData }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText(data))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API 미지원 환경 — 무시
    }
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600">복사됨</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          개발자에게 공유
        </>
      )}
    </button>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
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
      } catch { /* 네트워크 오류는 무시 */ }
    })
  }, [])

  useEffect(() => {
    const iv = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(iv)
  }, [refresh])

  useEffect(() => {
    const tick = setInterval(() => setCountdown((n) => (n > 1 ? n - 1 : REFRESH_INTERVAL_MS / 1000)), 1000)
    return () => clearInterval(tick)
  }, [lastChecked])

  const dbSpeed = data ? dbSpeedInfo(data.db.responseMs, data.db.coldStart) : null
  const conn    = data?.connections ? connInfo(data.connections.total) : null
  const slow    = data?.slowQueries ? slowCount(data.slowQueries) : null
  const connRatio = data?.connections ? data.connections.total / CONN_POOL_MAX : 0
  const connBarColor = connRatio > 0.8 ? 'bg-red-500' : connRatio > 0.6 ? 'bg-amber-400' : 'bg-green-500'

  return (
    <div className="space-y-4">

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">시스템 모니터링</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {lastChecked ? `마지막 확인 ${timeAgo(lastChecked)}` : '확인 중...'}
            {data && ` · ${countdown}초 후 자동 갱신`}
          </p>
        </div>
        <div className="flex gap-2">
          {data && <ShareButton data={data} />}
          <button
            onClick={refresh} disabled={isPending}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isPending ? '확인 중' : '지금 확인'}
          </button>
        </div>
      </div>

      {/* 전체 상태 배너 */}
      <StatusBanner status={data ? data.status : 'loading'} coldStart={data?.db.coldStart} />

      {/* 핵심 지표 */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="DB 응답 속도"
          value={data ? `${data.db.responseMs}ms` : '—'}
          detail={dbSpeed?.label ?? '측정 중'}
          detailColor={dbSpeed?.color ?? 'text-zinc-400'}
          hint={dbSpeed?.hint}
        />
        <MetricCard
          label="현재 DB 연결 수"
          value={data?.connections ? `${data.connections.total}개` : '—'}
          detail={conn?.label ?? '측정 중'}
          detailColor={conn?.color ?? 'text-zinc-400'}
          hint={conn?.hint}
          bar={connRatio}
          barColor={connBarColor}
        />
        <MetricCard
          label="앱 느린 쿼리"
          value={data?.slowQueries != null ? `${data.slowQueries.length}개` : '—'}
          detail={slow?.label ?? (data?.slowQueriesAvailable === false ? '분석 미활성' : '측정 중')}
          detailColor={slow?.color ?? 'text-zinc-400'}
          hint={
            data?.slowQueriesAvailable === false
              ? 'pg_stat_statements 확장을 활성화하면 사용할 수 있습니다.'
              : data?.slowQueries?.length === 0
                ? '시스템 내부 쿼리는 제외됩니다.'
                : undefined
          }
        />
      </div>

      {/* 해야 할 일 */}
      {data && <ActionPanel data={data} />}

      {/* 느린 쿼리 상세 */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-zinc-100">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">앱 느린 쿼리 분석</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                실제 학생/관리자 기능 중 오래 걸리는 DB 조회만 표시합니다
                <span className="ml-1 text-zinc-300">(Supabase 내부 쿼리 제외)</span>
              </p>
            </div>
            <span className="text-[10px] text-zinc-400 mt-0.5 flex-shrink-0">
              ▶ 을 눌러 SQL 확인
            </span>
          </div>
        </div>
        <div className="px-4">
          {!data && (
            <p className="py-6 text-sm text-zinc-400 text-center">데이터를 불러오는 중...</p>
          )}
          {data && data.slowQueriesAvailable === false && (
            <div className="py-6 text-center">
              <p className="text-sm text-zinc-400 mb-1">pg_stat_statements 확장이 꺼져 있습니다</p>
              <p className="text-xs text-zinc-300">Supabase 대시보드 → Database → Extensions → pg_stat_statements 켜기</p>
            </div>
          )}
          {data?.slowQueriesAvailable && data.slowQueries?.length === 0 && (
            <div className="py-6 flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                앱 관련 느린 쿼리 없음
              </div>
              <p className="text-xs text-zinc-400">모든 기능의 DB 조회가 300ms 이내에 처리되고 있습니다</p>
            </div>
          )}
          {data?.slowQueries && data.slowQueries.length > 0 && data.slowQueries.map((q, i) => (
            <SlowQueryRow key={i} q={q} rank={i + 1} />
          ))}
        </div>
      </div>

      {/* 연결 상세 */}
      {data?.connections && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-3">DB 연결 상세</p>
          <div className="grid grid-cols-4 gap-3 mb-3">
            {[
              { label:'전체',     value: data.connections.total,   note: `/ ${CONN_POOL_MAX}개 한도`,    warn: false },
              { label:'활성',     value: data.connections.active,  note: '쿼리 실행 중',                  warn: false },
              { label:'유휴',     value: data.connections.idle,    note: '다음 요청 대기',                 warn: false },
              { label:'잠금 대기', value: data.connections.waiting, note: '응답 지연 가능성',               warn: data.connections.waiting > 2 },
            ].map(({ label, value, note, warn }) => (
              <div key={label} className="text-center">
                <p className={`text-2xl font-bold tabular-nums ${warn ? 'text-amber-600' : 'text-zinc-900'}`}>{value}</p>
                <p className="text-xs font-semibold text-zinc-600">{label}</p>
                <p className="text-[10px] text-zinc-400">{note}</p>
              </div>
            ))}
          </div>
          <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${connBarColor}`}
              style={{ width: `${Math.min(connRatio * 100, 100).toFixed(1)}%` }} />
          </div>
          <p className="text-[10px] text-zinc-400 mt-1 text-right tabular-nums">
            {(connRatio * 100).toFixed(0)}% 사용 중 ({data.connections.total} / {CONN_POOL_MAX})
          </p>
        </div>
      )}
    </div>
  )
}
