'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface SeriesPoint {
  date: string
  score: number
  maxScore: number
  label: string
}

type ChartRow = {
  date: string
  날짜: string
  테스트?: number
  특별시험?: number
  testDetail?: string
  examDetail?: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function pct(p: SeriesPoint) {
  return p.maxScore > 0 ? Math.round((p.score / p.maxScore) * 1000) / 10 : 0
}

// 정기 테스트(다양한 만점)와 특별시험(모의고사 등)은 만점 기준이 서로 달라
// 원점수를 그대로 겹쳐 그리면 왜곡되므로 백분율로 정규화해 같은 축에서 비교한다.
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartRow }> }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-zinc-900 mb-1">{row.날짜}</p>
      {row.testDetail && <p className="text-zinc-600">테스트: {row.testDetail}</p>}
      {row.examDetail && <p className="text-amber-700">특별시험: {row.examDetail}</p>}
    </div>
  )
}

export function ScoreChart({ tests, exams }: { tests: SeriesPoint[]; exams: SeriesPoint[] }) {
  const rows: ChartRow[] = [
    ...tests.map((t) => ({
      date: t.date,
      날짜: fmtDate(t.date),
      테스트: pct(t),
      testDetail: `${t.label} ${t.score}/${t.maxScore}점 (${pct(t)}%)`,
    })),
    ...exams.map((e) => ({
      date: e.date,
      날짜: fmtDate(e.date),
      특별시험: pct(e),
      examDetail: `${e.label} ${e.score}/${e.maxScore}점 (${pct(e)}%)`,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const hasExams = exams.length > 0

  return (
    <div>
      {hasExams && (
        <div className="flex items-center gap-4 px-1 pb-2 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-950" />
            테스트
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            특별시험
          </span>
        </div>
      )}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 5, right: 8, bottom: 5, left: -25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis dataKey="날짜" tick={{ fontSize: 10, fill: '#a1a1aa' }} />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10, fill: '#a1a1aa' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="테스트"
              stroke="#09090b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#09090b', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
            {hasExams && (
              <Line
                type="monotone"
                dataKey="특별시험"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
