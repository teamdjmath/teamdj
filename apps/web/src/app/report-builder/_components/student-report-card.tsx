'use client'

import { forwardRef } from 'react'

export interface AssignmentItem {
  slotNum: number     // circular display slot 1-10
  lectureNum: number  // actual lecture number shown in table
  issueDate: string   // 출제일 "M/D" format
  submitDate: string  // 제출일 "M/D" format
  completion: number  // 이행도 0-5
}

export interface StudentData {
  school: string
  grade: string
  name: string
  attendance: string     // 출석여부 (blank → "출석")
  arrivalTime: string
  departureTime: string
  studyContent: string   // 학습내용
  testScore: number | null
  specialNote: string    // 특이사항&공지사항
  assignments: AssignmentItem[]
}

interface Props {
  student: StudentData
  className: string        // 분반명 (from filename)
  dateString: string       // "7/2" or "7/2, 7/3"
  maxScore: number | null
  classAvg: number | null
  classStdDev: number | null
  classNotice: string      // 반 공통 공지사항 (한 셀 공유)
}

const C = {
  dark:   '#111111',
  body:   '#1e1e1e',
  sub:    '#555555',
  hint:   '#999999',
  border: '#e0e0e0',
  rowBg:  '#f5f5f5',
  white:  '#ffffff',
}

function Circles({ count }: { count: number }) {
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

function AssignmentTable({ assignments }: { assignments: AssignmentItem[] }) {
  const slotMap = new Map<number, AssignmentItem>()
  for (const a of assignments) {
    slotMap.set(a.slotNum, a)
  }

  // 강좌 컬럼: "10강"(~24px 텍스트) + 양측 패딩 3px = 30px 최소 → 36px 확보
  // 날짜 컬럼: "10/31"(~28px) + 패딩 = 34px 최소 → 38px 확보
  // 이행도 컬럼: 나머지 공간 (auto) — 5×10px circles + 4×3px gap = 62px 충분히 수용
  const th: React.CSSProperties = {
    padding: '3px 4px',
    fontSize: 10,
    fontWeight: 700,
    color: C.sub,
    backgroundColor: '#fafafa',
    borderBottom: `1px solid ${C.border}`,
    borderRight: `1px solid ${C.border}`,
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
  }
  const td: React.CSSProperties = {
    padding: '3px 4px',
    height: 20,
    fontSize: 11,
    color: C.body,
    borderBottom: `1px solid ${C.border}`,
    borderRight: `1px solid ${C.border}`,
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
    verticalAlign: 'middle' as const,
  }

  const renderSlot = (slot: number) => {
    const item = slotMap.get(slot)
    return (
      <tr key={slot}>
        <td style={td}>{item ? `${item.lectureNum}강` : ''}</td>
        <td style={td}>{item?.issueDate ?? ''}</td>
        <td style={td}>{item?.submitDate ?? ''}</td>
        <td style={{ ...td, borderRight: 'none', padding: '3px 4px' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {item ? <Circles count={item.completion} /> : null}
          </div>
        </td>
      </tr>
    )
  }

  const tStyle: React.CSSProperties = {
    flex: 1,
    borderCollapse: 'collapse',
    border: `1px solid ${C.border}`,
    tableLayout: 'fixed' as const,
    width: '100%',
  }

  const cols = (
    <colgroup>
      <col style={{ width: 36 }} />
      <col style={{ width: 38 }} />
      <col style={{ width: 38 }} />
      <col />
    </colgroup>
  )

  const thead = (
    <thead>
      <tr>
        <th style={th}>강좌</th>
        <th style={th}>출제일</th>
        <th style={th}>제출일</th>
        <th style={{ ...th, borderRight: 'none' }}>이행도</th>
      </tr>
    </thead>
  )

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <table style={tStyle}>
        {cols}
        {thead}
        <tbody>{[1, 2, 3, 4, 5].map(renderSlot)}</tbody>
      </table>

      <table style={tStyle}>
        {cols}
        {thead}
        <tbody>{[6, 7, 8, 9, 10].map(renderSlot)}</tbody>
      </table>
    </div>
  )
}

export const StudentReportCard = forwardRef<HTMLDivElement, Props>(
  ({ student, className: classNameProp, dateString, maxScore, classAvg, classStdDev, classNotice }, ref) => {
    const {
      school, grade, name, attendance,
      arrivalTime, departureTime,
      studyContent, testScore, specialNote, assignments,
    } = student

    const title = dateString
      ? `${dateString} 역전의 수학 학습결과`
      : '역전의 수학 학습결과'

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
              <td style={{ ...infoTh, width: 36 }}>학교</td>
              <td style={infoTd}>{school || '—'}</td>
              <td style={{ ...infoTh, width: 36 }}>학년</td>
              <td style={infoTd}>{grade || '—'}</td>
              <td style={{ ...infoTh, width: 36 }}>이름</td>
              <td style={{ ...infoTd, borderRight: 'none' }}>{name}</td>
            </tr>
            <tr>
              <td style={{ ...infoTh, borderBottom: 'none' }}>출석</td>
              <td style={{ ...infoTd, borderBottom: 'none' }}>{attendance || '출석'}</td>
              <td style={{ ...infoTh, borderBottom: 'none' }}>강좌</td>
              <td style={{ ...infoTd, borderBottom: 'none', borderRight: 'none' }} colSpan={3}>
                {classNameProp || '—'}
              </td>
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

        {/* 학습내용 */}
        <SectionHeader label="학습내용" />
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ margin: 0, fontSize: 13, color: C.body, lineHeight: 1.85, whiteSpace: 'pre-line' as const }}>
            {studyContent || '—'}
          </p>
        </div>

        {/* 테스트 점수 */}
        <SectionHeader label="테스트 점수" />
        <div style={{ padding: '9px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.body }}>
              {testScore !== null
                ? `${testScore}점${maxScore ? ` / ${maxScore}점` : ''}`
                : '—'}
            </span>
            {classAvg !== null && (
              <span style={{ fontSize: 12, color: C.sub }}>
                반 평균&nbsp;
                <span style={{ fontWeight: 700 }}>{classAvg}점</span>
                &nbsp;&nbsp;표준편차&nbsp;
                <span style={{ fontWeight: 700 }}>{classStdDev}점</span>
              </span>
            )}
          </div>
        </div>

        {/* 과제검사 */}
        <SectionHeader label="과제검사" />
        <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}` }}>
          <AssignmentTable assignments={assignments} />
        </div>

        {/* 특이사항 & 공지사항 (하나라도 있으면 표시) */}
        {(specialNote?.trim() || classNotice?.trim()) && (
          <>
            <SectionHeader label="특이사항 & 공지사항" />
            <div style={{ padding: '10px 12px' }}>
              {specialNote?.trim() && (
                <p style={{ margin: 0, fontSize: 13, color: C.body, lineHeight: 1.85, whiteSpace: 'pre-line' as const }}>
                  {specialNote}
                </p>
              )}
              {specialNote?.trim() && classNotice?.trim() && (
                <div style={{ height: 8 }} />
              )}
              {classNotice?.trim() && (
                <p style={{ margin: 0, fontSize: 13, color: C.body, lineHeight: 1.85, whiteSpace: 'pre-line' as const }}>
                  {classNotice}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    )
  }
)

StudentReportCard.displayName = 'StudentReportCard'
