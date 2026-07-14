import { type RefObject } from 'react'
import type { ReportContent } from '@/lib/actions/reports'

export type ReportCardData = {
  studentName: string
  className: string
  reportDate: string
  school: string
  grade: string
  content: ReportContent
}

interface Props {
  data: ReportCardData
  cardRef?: RefObject<HTMLDivElement | null>
}

function formatAdminDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
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

type DisplayAssignment = {
  slotNum: number
  lectureNum: number
  issueDate: string
  submitDate: string
  completion: number | null   // null = 미지참 (beforeEnrollment=true면 '첫 등원 이전')
  beforeEnrollment: boolean
}

function AssignmentTable({ assignments }: { assignments: DisplayAssignment[] }) {
  const slotMap = new Map<number, DisplayAssignment>()
  for (const a of assignments) slotMap.set(a.slotNum, a)

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
            {item
              ? item.beforeEnrollment
                ? <span style={{ fontSize: 10, fontWeight: 700, color: '#2c6fbb' }}>첫 등원 이전</span>
                : item.completion === null
                  ? <span style={{ fontSize: 10, fontWeight: 700, color: '#c0392b' }}>미지참</span>
                  : <Circles count={item.completion} />
              : null}
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

export function ReportCard({ data, cardRef }: Props) {
  const { studentName, school, grade, className, reportDate, content } = data
  const {
    studyContent, homework, announcement, notes, todayAttendance,
    recentScore, classStdDev, assignmentsDetail, absenceReason,
  } = content

  const dateObj = new Date(reportDate)
  const dateString = !isNaN(dateObj.getTime())
    ? `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
    : reportDate

  const title = `${dateString} 역전의 수학 학습결과`

  const attendanceLabel =
    todayAttendance === 'present'      ? '출석' :
    todayAttendance === 'late'         ? '지각' :
    todayAttendance === 'absent'       ? '결석(차감)' :
    todayAttendance === 'absent_video' ? '결석(영상)' : '출석'

  // convert admin assignments (0-100%) → display items (0-5 circles)
  // weekNum이 있으면 실제 강좌 번호 사용, 없으면 배열 순서 fallback
  const displayAssignments: DisplayAssignment[] = (assignmentsDetail ?? [])
    .slice(0, 10)
    .map((a, i) => {
      const lectureNum = a.weekNum ?? (i + 1)
      const slotNum    = ((lectureNum - 1) % 10) + 1
      return {
        slotNum,
        lectureNum,
        issueDate:  a.issueDate ? formatAdminDate(a.issueDate) : '',
        submitDate: a.completionPct === null ? '' : a.submitDate ? formatAdminDate(a.submitDate) : '',
        completion: a.completionPct === null ? null : Math.min(5, Math.round(a.completionPct / 20)),
        beforeEnrollment: a.beforeEnrollment ?? false,
      }
    })

  // maxScore(만점)는 tests.max_score를 써야 함 — totalQ(문항 수)는 만점과 다른 값
  // (예: 20문항 100점). 옛 리포트는 maxScore가 저장 전이라 totalQ로 대체 표시.
  const maxScore    = recentScore?.maxScore ?? recentScore?.totalQ ?? null
  const classAvg    = recentScore?.classAverage ?? null
  const testScore   = recentScore?.score ?? null
  const testAbsent  = recentScore?.absent === true
  // 결석 사유는 특이사항 맨 앞에 표시 — absenceReason은 사유 없을 때 '-'로 채워져 있으므로 제외
  const hasAbsenceReason = !!absenceReason?.trim() && absenceReason.trim() !== '-'
  const specialNote = [
    hasAbsenceReason && `결석 사유: ${absenceReason!.trim()}`,
    notes?.trim(),
  ].filter(Boolean).join('\n')

  // class-wide notice: homework first, then announcement
  const classNotice = [
    homework?.trim()      && `다음 시간 과제: ${homework.trim()}`,
    announcement?.trim(),
  ].filter(Boolean).join('\n')

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
      ref={cardRef as RefObject<HTMLDivElement>}
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
      <div style={{ backgroundColor: C.dark, padding: '7px 16px', textAlign: 'center' as const }}>
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
        <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{title}</span>
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
            <td style={{ ...infoTd, borderRight: 'none' }}>{studentName}</td>
          </tr>
          <tr>
            <td style={{ ...infoTh, borderBottom: 'none' }}>출석</td>
            <td style={{ ...infoTd, borderBottom: 'none' }}>{attendanceLabel}</td>
            <td style={{ ...infoTh, borderBottom: 'none' }}>강좌</td>
            <td style={{ ...infoTd, borderBottom: 'none', borderRight: 'none' }} colSpan={3}>
              {className || '—'}
            </td>
          </tr>
        </tbody>
      </table>

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
          <span style={{ fontSize: 15, fontWeight: 700, color: testAbsent ? '#c0392b' : C.body }}>
            {testAbsent
              ? '미응시'
              : testScore !== null
              ? `${testScore}점${maxScore ? ` / ${maxScore}점` : ''}`
              : '—'}
          </span>
          {classAvg !== null && (
            <span style={{ fontSize: 12, color: C.sub }}>
              반 평균&nbsp;
              <span style={{ fontWeight: 700 }}>{classAvg}점</span>
              {classStdDev != null && (
                <>
                  &nbsp;&nbsp;표준편차&nbsp;
                  <span style={{ fontWeight: 700 }}>{classStdDev}점</span>
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {/* 과제검사 */}
      <SectionHeader label="과제검사" />
      <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}` }}>
        <AssignmentTable assignments={displayAssignments} />
      </div>

      {/* 특이사항 & 공지사항 */}
      {(specialNote?.trim() || classNotice?.trim()) && (
        <>
          <SectionHeader label="특이사항 & 공지사항" />
          <div style={{ padding: '10px 12px' }}>
            {specialNote?.trim() && (
              <p style={{ margin: 0, fontSize: 13, color: C.body, lineHeight: 1.85, whiteSpace: 'pre-line' as const }}>
                {specialNote}
              </p>
            )}
            {specialNote?.trim() && classNotice?.trim() && <div style={{ height: 8 }} />}
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
