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

// 검증된 카테고리 팔레트 (scripts/validate_palette.js: 2색 모두 PASS) — 순수 회색·검정은
// 카테고리 색으로 쓰면 "비활성"으로 읽혀 채도 하한을 통과하지 못한다
const TEST_COLOR = '#2a78d6'
const EXAM_COLOR = '#d97706'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function pct(p: SeriesPoint) {
  return p.maxScore > 0 ? Math.round((p.score / p.maxScore) * 1000) / 10 : 0
}

// 정기 테스트(다양한 만점)와 특별시험(모의고사 등)은 만점 기준이 서로 달라
// 원점수를 그대로 겹쳐 그리면 왜곡되므로 백분율로 정규화해 같은 축에서 비교한다.
// 식별은 텍스트 색이 아니라 컬러 스와치가 담당 — 값 텍스트는 항상 잉크 톤 유지
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartRow }> }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm space-y-1">
      <p className="font-medium text-zinc-900">{row.날짜}</p>
      {row.testDetail && (
        <p className="flex items-center gap-1.5 text-zinc-600">
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: TEST_COLOR }} />
          {row.testDetail}
        </p>
      )}
      {row.examDetail && (
        <p className="flex items-center gap-1.5 text-zinc-600">
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: EXAM_COLOR }} />
          {row.examDetail}
        </p>
      )}
    </div>
  )
}

// 엔드포인트에만 값을 라벨링 — 점마다 숫자를 달면 소음이 된다 (marks-and-anatomy: "Lines → value at the end")
function makeEndLabel(lastIndex: number, color: string) {
  function EndLabel(props: { x?: number; y?: number; index?: number; value?: number }) {
    if (props.index !== lastIndex || props.value == null) return <g />
    return (
      <text x={props.x} y={(props.y ?? 0) - 10} textAnchor="middle" fontSize={11} fontWeight={600} fill={color}>
        {props.value}%
      </text>
    )
  }
  return EndLabel
}

export function ScoreChart({ tests, exams }: { tests: SeriesPoint[]; exams: SeriesPoint[] }) {
  const hasTests = tests.length > 0
  const hasExams = exams.length > 0

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

  const lastTestIdx = rows.reduce((acc, r, i) => (r.테스트 != null ? i : acc), -1)
  const lastExamIdx = rows.reduce((acc, r, i) => (r.특별시험 != null ? i : acc), -1)

  // 값 범위에 맞춰 축을 좁혀 추이가 눌려 보이지 않게 한다 (0~100 고정 시 78→88 같은 변화가 안 보임)
  const allPct = [
    ...rows.map((r) => r.테스트).filter((v): v is number => v != null),
    ...rows.map((r) => r.특별시험).filter((v): v is number => v != null),
  ]
  const dataMin = allPct.length ? Math.min(...allPct) : 0
  const dataMax = allPct.length ? Math.max(...allPct) : 100
  const yMin = Math.max(0, Math.floor((dataMin - 10) / 10) * 10)
  const yMax = Math.min(100, Math.ceil((dataMax + 10) / 10) * 10)

  return (
    <div>
      {(hasTests || hasExams) && (
        <div className="flex items-center gap-4 px-1 pb-2 text-[11px] text-zinc-500">
          {hasTests && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TEST_COLOR }} />
              테스트
            </span>
          )}
          {hasExams && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: EXAM_COLOR }} />
              특별시험
            </span>
          )}
        </div>
      )}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 16, right: 8, bottom: 5, left: -25 }}>
            <CartesianGrid stroke="#f4f4f5" vertical={false} />
            <XAxis dataKey="날짜" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={{ stroke: '#e4e4e7' }} tickLine={false} />
            <YAxis
              domain={[yMin, yMax]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10, fill: '#a1a1aa' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {hasTests && (
              <Line
                type="monotone"
                dataKey="테스트"
                stroke={TEST_COLOR}
                strokeWidth={2}
                dot={{ r: 4, fill: TEST_COLOR, stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                // recharts의 Line<T> 제네릭이 label 콜백까지 데이터 row 타입을 강요해 충돌 — 공개 타입이 실제 런타임 프롭(index 등)을 못 담는 케이스
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={makeEndLabel(lastTestIdx, TEST_COLOR) as any}
                connectNulls
              />
            )}
            {hasExams && (
              <Line
                type="monotone"
                dataKey="특별시험"
                stroke={EXAM_COLOR}
                strokeWidth={2}
                dot={{ r: 4, fill: EXAM_COLOR, stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={makeEndLabel(lastExamIdx, EXAM_COLOR) as any}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
