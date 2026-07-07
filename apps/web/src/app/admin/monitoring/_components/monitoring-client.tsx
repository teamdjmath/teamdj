'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export type BehaviorStats = {
  attendance_daily:  Array<{ day: string; count: number }>
  qna_daily:         Array<{ day: string; questions: number; answers: number }>
  assignment_weekly: Array<{ week: string; avg_pct: number; entries: number }>
  report_kakao:      { total: number; sent: number }
  notices_30d:       { total: number; read_rate: number | null }
  login_7d:          { success: number; failed: number }
}

export type AiUsageStats = {
  calls: number
  hintCalls: number
  fullCalls: number
  totalTokens: number
  costKrw: number
  avgHintKrw: number | null
  avgFullKrw: number | null
}

interface Props {
  stats: BehaviorStats | null
  aiUsage: AiUsageStats | null
  checkedAt: string
}

function fmtDay(iso: string) {
  const parts = iso.split('-')
  return parts.length >= 3 ? `${Number(parts[1])}/${Number(parts[2])}` : iso
}

// 미니 막대 차트 — 외부 라이브러리 없이 flexbox로
function BarChart({ data, color = 'bg-zinc-900' }: { data: Array<{ label: string; value: number }>; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0 h-full">
          <span className="text-[9px] text-zinc-400 tabular-nums leading-none">
            {d.value > 0 ? d.value : ''}
          </span>
          <div
            className={`w-full rounded-t ${d.value > 0 ? color : 'bg-zinc-100'}`}
            style={{ height: `${Math.max((d.value / max) * 75, d.value > 0 ? 6 : 2)}%` }}
          />
          <span className="text-[9px] text-zinc-400 truncate leading-none">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function MetricCard({
  title, sub, children,
}: {
  title: string
  sub?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

function formatKrw(v: number): string {
  if (v >= 100) return `${Math.round(v).toLocaleString('ko-KR')}원`
  return `${v.toFixed(1)}원`
}

export function MonitoringClient({ stats, aiUsage, checkedAt }: Props) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  function refresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 800)
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white py-20 text-center">
        <p className="text-sm text-zinc-400 mb-2">지표를 불러오지 못했습니다.</p>
        <p className="text-xs text-zinc-400">마이그레이션 050이 적용되었는지 확인해주세요. (monitoring_behavior_stats)</p>
      </div>
    )
  }

  const kakaoRate = stats.report_kakao.total > 0
    ? Math.round((stats.report_kakao.sent / stats.report_kakao.total) * 100)
    : null

  const loginTotal = stats.login_7d.success + stats.login_7d.failed
  const loginFailRate = loginTotal > 0
    ? Math.round((stats.login_7d.failed / loginTotal) * 100)
    : null

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-950">모니터링</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            기능별 사용 현황 · {new Date(checkedAt).toLocaleTimeString('ko-KR')} 집계 (5분 주기)
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
        >
          {refreshing ? '갱신 중…' : '새로고침'}
        </button>
      </div>

      {/* 요약 카드 3개 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs text-zinc-400 mb-1">리포트 알림율 (30일)</p>
          <p className="text-2xl font-bold text-zinc-950 tabular-nums">
            {kakaoRate !== null ? `${kakaoRate}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            생성 {stats.report_kakao.total}건 중 {stats.report_kakao.sent}건 발송
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs text-zinc-400 mb-1">공지 열람율 (30일)</p>
          <p className="text-2xl font-bold text-zinc-950 tabular-nums">
            {stats.notices_30d.read_rate !== null ? `${stats.notices_30d.read_rate}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-zinc-400">발행 {stats.notices_30d.total}건 기준</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs text-zinc-400 mb-1">로그인 (7일)</p>
          <p className="text-2xl font-bold text-zinc-950 tabular-nums">
            {stats.login_7d.success}회
            {loginFailRate !== null && loginFailRate > 0 && (
              <span className="ml-2 text-sm font-medium text-red-500">실패 {loginFailRate}%</span>
            )}
          </p>
          <p className="mt-1 text-xs text-zinc-400">성공 {stats.login_7d.success} · 실패 {stats.login_7d.failed}</p>
        </div>
      </div>

      {/* AI 사용량 · 예상 요금 */}
      <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">AI 초안 사용량 (이번 달)</h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            Gemini 2.5 Flash 유료 티어 단가 기준 예상 금액 — 무료 티어 키 사용 중에는 실제 청구 0원
          </p>
        </div>
        {!aiUsage || aiUsage.calls === 0 ? (
          <p className="py-4 text-center text-xs text-zinc-400">이번 달 AI 호출 기록이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-zinc-400">호출 수</p>
              <p className="mt-1 text-xl font-bold text-zinc-950 tabular-nums">{aiUsage.calls}건</p>
              <p className="mt-0.5 text-xs text-zinc-400">힌트 {aiUsage.hintCalls} · 최종답 {aiUsage.fullCalls}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">예상 요금</p>
              <p className="mt-1 text-xl font-bold text-zinc-950 tabular-nums">{formatKrw(aiUsage.costKrw)}</p>
              <p className="mt-0.5 text-xs text-zinc-400">토큰 {aiUsage.totalTokens.toLocaleString('ko-KR')}개</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">평균 비용 / 건</p>
              <p className="mt-1 text-xl font-bold text-zinc-950 tabular-nums">
                {aiUsage.avgFullKrw !== null ? formatKrw(aiUsage.avgFullKrw) : '—'}
                <span className="ml-1 text-xs font-normal text-zinc-400">최종답</span>
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                힌트 {aiUsage.avgHintKrw !== null ? formatKrw(aiUsage.avgHintKrw) : '—'} / 건
              </p>
            </div>
          </div>
        )}
        <p className="mt-4 border-t border-zinc-100 pt-3 text-[11px] leading-relaxed text-zinc-400">
          참고 단가 (건당 예상): 힌트 모드 ~5원 · 최종답 모드 평이한 문제 ~20원, 보통 ~30원, 킬러급 ~75원.
          실측 평균이 쌓이면 위 "평균 비용 / 건"을 기준으로 보세요.
        </p>
      </div>

      {/* 트렌드 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MetricCard title="출석체크 사용 빈도" sub="최근 14일 · 일별 기록 수">
          {stats.attendance_daily.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-400">기록이 없습니다.</p>
          ) : (
            <BarChart data={stats.attendance_daily.map((d) => ({ label: fmtDay(d.day), value: d.count }))} />
          )}
        </MetricCard>

        <MetricCard title="Q&A 참여도" sub="최근 14일 · 위: 질문 / 아래: 답변">
          {stats.qna_daily.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-400">기록이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              <BarChart data={stats.qna_daily.map((d) => ({ label: fmtDay(d.day), value: d.questions }))} />
              <BarChart
                data={stats.qna_daily.map((d) => ({ label: fmtDay(d.day), value: d.answers }))}
                color="bg-zinc-400"
              />
            </div>
          )}
        </MetricCard>

        <MetricCard title="과제 제출율 트렌드" sub="최근 8주 · 주별 평균 이행률 (%)">
          {stats.assignment_weekly.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-400">기록이 없습니다.</p>
          ) : (
            <BarChart data={stats.assignment_weekly.map((d) => ({ label: d.week, value: d.avg_pct }))} />
          )}
        </MetricCard>

        <MetricCard title="주별 과제 입력량" sub="최근 8주 · 진행도 입력 건수">
          {stats.assignment_weekly.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-400">기록이 없습니다.</p>
          ) : (
            <BarChart
              data={stats.assignment_weekly.map((d) => ({ label: d.week, value: d.entries }))}
              color="bg-zinc-400"
            />
          )}
        </MetricCard>
      </div>
    </div>
  )
}
