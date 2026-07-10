'use client'

import { forwardRef } from 'react'

export interface ClinicStudentData {
  school: string
  grade: string
  name: string
  arrivalTime: string
  departureTime: string
  clinicContent: string
}

interface Props {
  student: ClinicStudentData
  dateString: string   // "7/2" or "7/2, 7/3"
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

export const ClinicReportCard = forwardRef<HTMLDivElement, Props>(
  ({ student, dateString }, ref) => {
    const { school, grade, name, arrivalTime, departureTime, clinicContent } = student

    const title = dateString
      ? `${dateString} 역전의 수학 클리닉 리포트`
      : '역전의 수학 클리닉 리포트'

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

        {/* 클리닉 내용 */}
        <SectionHeader label="클리닉 내용" />
        <div style={{ padding: '12px 14px', minHeight: 120 }}>
          <p style={{ margin: 0, fontSize: 13, color: C.body, lineHeight: 1.85, whiteSpace: 'pre-line' as const }}>
            {clinicContent || '—'}
          </p>
        </div>
      </div>
    )
  }
)

ClinicReportCard.displayName = 'ClinicReportCard'
