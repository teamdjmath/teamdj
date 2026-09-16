'use client'

import { forwardRef } from 'react'

export interface ExamPrepMockExam {
  status: 'none' | 'attended' | 'absent'
  examLabel?: string
  score?: number | null
}

export interface ExamPrepPlanItem {
  id: string
  content: string
  progressPct: number // 0/20/40/60/80/100
}

export interface ExamPrepStudentData {
  school: string
  grade: string
  name: string
  arrivalTime: string
  departureTime: string
  studyContent: string
  planItems: ExamPrepPlanItem[]
  mockExam: ExamPrepMockExam
}

interface Props {
  student: ExamPrepStudentData
  dateString: string // "9/17"
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

// 이행도(0/20/40/60/80/100%) — 20%당 원 하나, 일반 학습 리포트의 과제 이행도 표시와 동일한 스타일
function ProgressCircles({ pct }: { pct: number }) {
  const count = Math.min(5, Math.round(pct / 20))
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: i < count ? C.dark : C.white,
            border: `1.5px solid ${i < count ? C.dark : '#b5b5b5'}`,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  )
}

export const ExamPrepReportCard = forwardRef<HTMLDivElement, Props>(
  ({ student, dateString }, ref) => {
    const { school, grade, name, arrivalTime, departureTime, studyContent, planItems, mockExam } = student

    const title = dateString
      ? `${dateString} 역전의 수학 내신대비 리포트`
      : '역전의 수학 내신대비 리포트'

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

        {/* 내신대비 계획 이행 현황 (날짜 무관, 학생별 현재 상태 스냅샷) */}
        {planItems.length > 0 && (
          <>
            <SectionHeader label="내신대비 계획 이행 현황" />
            <div>
              {planItems.map((item, i) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    padding: '8px 14px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, color: C.body, lineHeight: 1.5, whiteSpace: 'pre-line' as const }}>
                    {item.content}
                  </p>
                  <div style={{ flexShrink: 0 }}>
                    <ProgressCircles pct={item.progressPct} />
                  </div>
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
