'use client'

import { forwardRef } from 'react'

export interface ExamPrepMockExam {
  status: 'none' | 'attended' | 'absent'
  examLabel?: string
  difficulty?: number | null
  score?: number | null
  note?: string
}

export interface ExamPrepStudentData {
  school: string
  grade: string
  name: string
  arrivalTime: string
  departureTime: string
  studyContent: string
  mockExam: ExamPrepMockExam
}

export interface ExamPrepHistoryEntry {
  date: string // "YYYY-MM-DD"
  studyContent: string
  mockExam: ExamPrepMockExam
}

interface Props {
  student: ExamPrepStudentData
  dateString: string // "9/17"
  history?: ExamPrepHistoryEntry[] // 전체 기간 누적 기록 (오늘 포함, 날짜순) — 모의고사 추이는 전체,
                                    // 학습 내용 누적은 이 중 이번 주(수~화)만 컴포넌트 내부에서 추려 사용
}

const C = {
  dark:   '#111111',
  body:   '#1e1e1e',
  sub:    '#555555',
  border: '#e0e0e0',
  rowBg:  '#f5f5f5',
  white:  '#ffffff',
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      padding: '5px 10px',
      backgroundColor: C.rowBg,
      borderTop: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
      fontSize: 11,
      fontWeight: 700,
      color: C.sub,
      textAlign: 'center' as const,
      letterSpacing: 0.5,
    }}>
      {label}
    </div>
  )
}

function fmtShortDate(iso: string) {
  const [, m, d] = iso.split('-')
  if (!m || !d) return iso
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`
}

// 학습 내용 누적이 내신대비 기간 내내 계속 쌓이면 이미지가 지나치게 길어지므로,
// 수요일을 기준으로 한 주(수~화)만 보여준다. dateStr이 속한 주의 "그 주 수요일" 날짜를 구한다.
function startOfWeekWednesday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const day = date.getDay() // 0=일 ~ 6=토, 3=수
  const diff = (day - 3 + 7) % 7
  date.setDate(date.getDate() - diff)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 2회 이상 응시 기록이 있을 때만 의미 있는 "추이" 그래프 — 1개뿐이면 점 하나만 찍혀
// 가독성이 떨어지므로 호출 쪽(ExamPrepReportCard)에서 아예 렌더링하지 않는다.
function ScoreTrendChart({ scores }: { scores: number[] }) {
  const W = 380
  const H = 116
  const padX = 20
  const padTop = 28 // 점 위에 점수 라벨을 쓸 공간
  const padBottom = 14
  const max = 100
  const n = scores.length
  const stepX = n > 1 ? (W - padX * 2) / (n - 1) : 0
  const points = scores.map((s, i) => {
    const x = padX + stepX * i
    const y = padTop + (H - padTop - padBottom) * (1 - Math.max(0, Math.min(100, s)) / max)
    return { x, y, score: s }
  })
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {[0, 50, 100].map((v) => {
        const y = padTop + (H - padTop - padBottom) * (1 - v / max)
        return <line key={v} x1={padX} y1={y} x2={W - padX} y2={y} stroke="#e8e8e8" strokeWidth={1} />
      })}
      <path d={pathD} fill="none" stroke={C.dark} strokeWidth={2} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3} fill={C.dark} />
          <text
            x={Math.min(Math.max(p.x, 20), W - 20)}
            y={Math.max(p.y - 10, 12)}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fill={C.dark}
          >
            {p.score}
          </text>
        </g>
      ))}
    </svg>
  )
}

export const ExamPrepReportCard = forwardRef<HTMLDivElement, Props>(
  ({ student, dateString, history }, ref) => {
    const { school, grade, name, arrivalTime, departureTime, studyContent, mockExam } = student

    const title = dateString
      ? `${dateString} 역전의 수학 내신대비 리포트`
      : '역전의 수학 내신대비 리포트'

    const attendedHistory = (history ?? []).filter((h) => h.mockExam.status === 'attended')

    // 학습 내용 누적은 (수~화) 한 주 분량만 — 가장 최근 날짜가 속한 주만 남긴다
    const latestDate = (history ?? []).reduce((max, h) => (h.date > max ? h.date : max), '')
    const weekStart = latestDate ? startOfWeekWednesday(latestDate) : ''
    const weeklyHistory = (history ?? []).filter((h) => h.date >= weekStart)

    const infoTh: React.CSSProperties = {
      padding: '7px 8px',
      fontSize: 11,
      fontWeight: 700,
      color: C.sub,
      backgroundColor: C.rowBg,
      borderRight: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
      textAlign: 'center' as const,
      whiteSpace: 'nowrap' as const,
    }
    const infoTd: React.CSSProperties = {
      padding: '7px 10px',
      fontSize: 13,
      fontWeight: 500,
      color: C.body,
      borderRight: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
    }
    const trendTh: React.CSSProperties = {
      padding: '5px 6px',
      fontSize: 10,
      fontWeight: 700,
      color: C.sub,
      borderBottom: `1px solid ${C.border}`,
      textAlign: 'left' as const,
      whiteSpace: 'nowrap' as const,
    }
    const trendTd: React.CSSProperties = {
      padding: '5px 6px',
      fontSize: 11,
      color: C.body,
      borderBottom: `1px solid ${C.border}`,
    }
    const trendTdNowrap: React.CSSProperties = {
      ...trendTd,
      whiteSpace: 'nowrap' as const,
    }

    return (
      <div
        ref={ref}
        style={{
          width: 420,
          backgroundColor: C.white,
          color: C.body,
          fontFamily: "'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif",
          boxSizing: 'border-box',
          overflow: 'hidden',
          border: `1px solid ${C.border}`,
        }}
      >
        {/* TeamDJ Header */}
        <div style={{
          backgroundColor: C.dark,
          padding: '7px 16px',
          textAlign: 'center' as const,
        }}>
          <span style={{
            fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: '-0.05em',
            textTransform: 'uppercase' as const,
            color: '#ffffff',
            fontStyle: 'italic',
          }}>
            TeamDJ
          </span>
        </div>

        {/* Report Title */}
        <div style={{
          padding: '9px 16px',
          textAlign: 'center' as const,
          borderBottom: `2px solid ${C.dark}`,
          backgroundColor: C.white,
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>
            {title}
          </span>
        </div>

        {/* Student Info Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ ...infoTh, width: 36, borderBottom: 'none' }}>학교</td>
              <td style={{ ...infoTd, borderBottom: 'none' }}>{school || '—'}</td>
              <td style={{ ...infoTh, width: 36, borderBottom: 'none' }}>학년</td>
              <td style={{ ...infoTd, borderBottom: 'none' }}>{grade || '—'}</td>
              <td style={{ ...infoTh, width: 36, borderBottom: 'none' }}>이름</td>
              <td style={{ ...infoTd, borderBottom: 'none', borderRight: 'none' }}>{name}</td>
            </tr>
          </tbody>
        </table>

        {/* 등원/하원 */}
        <div style={{
          display: 'flex',
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
        }}>
          {(['등원', '하원'] as const).map((label, i) => {
            const val = i === 0 ? arrivalTime : departureTime
            return (
              <div
                key={label}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  padding: '7px 10px',
                  borderLeft: i > 0 ? `1px solid ${C.border}` : 'none',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: 0.5 }}>{label}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.body, lineHeight: 1 }}>{val || '—'}</span>
              </div>
            )
          })}
        </div>

        {/* 오늘 학습 내용 */}
        <SectionHeader label="오늘 학습 내용" />
        <div style={{ padding: '12px 14px', minHeight: 100 }}>
          <p style={{ margin: 0, fontSize: 13, color: C.body, lineHeight: 1.85, whiteSpace: 'pre-line' as const }}>
            {studyContent || '—'}
          </p>
        </div>

        {/* 모의고사 (해당 날짜에 시험이 있었을 때만) */}
        {mockExam.status !== 'none' && (
          <>
            <SectionHeader label="모의중간·기말고사" />
            <div style={{ padding: '10px 14px' }}>
              {mockExam.status === 'absent' ? (
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.sub }}>미응시</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: C.sub }}>{mockExam.examLabel || '모의고사'}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>
                    {mockExam.score != null ? `${mockExam.score}점` : '—'}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* 모의고사 성적 추이 (누적) — 그래프는 응시 기록이 2회 이상일 때만 (1개뿐이면 점 하나만
            찍혀 가독성이 떨어지므로, 그 경우엔 표만 보여준다) */}
        {attendedHistory.length > 0 && (
          <>
            <SectionHeader label="모의고사 성적 추이" />
            <div style={{ padding: '10px 14px' }}>
              {attendedHistory.length >= 2 && (
                <ScoreTrendChart scores={attendedHistory.map((h) => h.mockExam.score ?? 0)} />
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: attendedHistory.length >= 2 ? 8 : 0 }}>
                <thead>
                  <tr>
                    <th style={trendTh}>회차</th>
                    <th style={{ ...trendTh, textAlign: 'center' }}>난이도</th>
                    <th style={{ ...trendTh, textAlign: 'center' }}>점수</th>
                    <th style={trendTh}>시험지 특이사항</th>
                  </tr>
                </thead>
                <tbody>
                  {attendedHistory.map((h, i) => (
                    <tr key={h.date}>
                      <td style={trendTd}>{h.mockExam.examLabel || `${i + 1}회`}</td>
                      <td style={{ ...trendTdNowrap, textAlign: 'center' }}>{h.mockExam.difficulty != null ? `${h.mockExam.difficulty}/5` : '—'}</td>
                      <td style={{ ...trendTdNowrap, textAlign: 'center', fontWeight: 700 }}>{h.mockExam.score != null ? `${h.mockExam.score}점` : '—'}</td>
                      <td style={trendTd}>{h.mockExam.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* 학습 내용 누적 (이번 주, 수~화) */}
        {weeklyHistory.length > 0 && (
          <>
            <SectionHeader label="학습 내용 누적 (이번 주)" />
            <div>
              {weeklyHistory.map((h, i) => (
                <div
                  key={h.date}
                  style={{ padding: '8px 14px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}
                >
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 2 }}>{fmtShortDate(h.date)}</p>
                  <p style={{ margin: 0, fontSize: 12, color: C.body, lineHeight: 1.6, whiteSpace: 'pre-line' as const }}>
                    {h.studyContent || '—'}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }
)

ExamPrepReportCard.displayName = 'ExamPrepReportCard'
