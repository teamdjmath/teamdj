import { forwardRef } from 'react'

export interface StudentData {
  school: string
  grade: string
  name: string
  arrivalTime: string
  departureTime: string
  studyContent: string
  specialNote: string
  assignments: Array<{ name: string; score: number }>
}

interface Props {
  student: StudentData
  reportTitle: string
  reportDateLabel: string
}

// ─── 팔레트
const W = {
  primary:   '#ffffff',
  secondary: 'rgba(255,255,255,0.82)',
  tertiary:  'rgba(255,255,255,0.50)',
  ghost:     'rgba(255,255,255,0.12)',
}
const B = {
  title:   '#0f0f0f',
  body:    '#1e1e1e',
  sub:     '#4a4a4a',
  hint:    '#9a9a9a',
  border:  '#e0e0e0',
  divider: '#f0f0f0',
  white:   '#ffffff',
  dark:    '#0f0f0f',
}

// ─── 섹션 라벨
function SectionLabel({ num, title }: { num: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
      <div style={{
        width: 26, height: 26,
        backgroundColor: B.dark,
        borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: 0.3 }}>
          {num}
        </span>
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, color: B.title, letterSpacing: -0.2 }}>
        {title}
      </span>
    </div>
  )
}

// ─── 과제 진도 행
function ProgressRow({ name, score, isLast }: { name: string; score: number; isLast: boolean }) {
  const n = Math.min(5, Math.max(0, score))
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '10px 0',
      borderBottom: isLast ? 'none' : `1px solid ${B.divider}`,
      gap: 8,
    }}>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: B.body, lineHeight: 1.3 }}>
        {name}
      </span>
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{
            width: 20, height: 20, borderRadius: '50%',
            backgroundColor: i < n ? B.dark : B.white,
            border: `2px solid ${i < n ? B.dark : '#bdbdbd'}`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: B.hint, minWidth: 26, textAlign: 'right' as const }}>
        {n}/5
      </span>
    </div>
  )
}

// ─── 카드
export const StudentReportCard = forwardRef<HTMLDivElement, Props>(
  ({ student, reportTitle, reportDateLabel }, ref) => {
    const { school, grade, name, arrivalTime, departureTime, studyContent, specialNote, assignments } = student
    const hasNote = !!specialNote?.trim()
    const headerLine = [reportDateLabel, reportTitle].filter(Boolean).join('  ·  ')

    return (
      <div
        ref={ref}
        style={{
          // ★ 420px → ×2 = 840px PNG
          // iPhone(390pt)에서 840px PNG ≈ 93% 화면 폭 → 폰트 14~16pt로 선명하게 표시
          width: 420,
          backgroundColor: B.white,
          color: B.body,
          fontFamily: "'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif",
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* ══ HEADER ══════════════════════════════ */}
        <div style={{ backgroundColor: B.dark }}>

          {/* TeamDJ 로고 */}
          <div style={{
            padding: '12px 24px',
            textAlign: 'center',
            borderBottom: `1px solid ${W.ghost}`,
          }}>
            <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: 2, color: W.primary, fontStyle: 'italic' }}>
              TeamDJ
            </span>
          </div>

          {/* 날짜 · 이름 · 학교 */}
          <div style={{ padding: '18px 24px 14px', textAlign: 'center' }}>
            {/* 날짜·제목 */}
            <p style={{
              margin: 0, marginBottom: 8,
              fontSize: 13, color: headerLine ? W.secondary : W.tertiary,
              fontWeight: 500, letterSpacing: 0.2,
              fontStyle: headerLine ? 'normal' : 'italic',
            }}>
              {headerLine || '날짜와 제목을 입력해주세요'}
            </p>

            {/* 이름 */}
            <p style={{
              margin: 0,
              fontSize: 40, fontWeight: 800, color: W.primary,
              letterSpacing: -1.5, lineHeight: 1,
            }}>
              {name}
            </p>

            {/* 학년·학교 */}
            <p style={{
              margin: 0, marginTop: 8,
              fontSize: 13, color: W.tertiary, letterSpacing: 0.6,
            }}>
              {grade}&nbsp;·&nbsp;{school}
            </p>
          </div>

          {/* 등원·하원 */}
          <div style={{ display: 'flex', borderTop: `1px solid ${W.ghost}` }}>
            {[
              { label: '등원', value: arrivalTime || '—' },
              { label: '하원', value: departureTime || '—' },
            ].map(({ label, value }, i) => (
              <div key={label} style={{
                flex: 1, padding: '12px 0', textAlign: 'center' as const,
                borderLeft: i > 0 ? `1px solid ${W.ghost}` : 'none',
              }}>
                <p style={{ margin: 0, marginBottom: 4, fontSize: 9, fontWeight: 700, letterSpacing: 2.5, color: W.tertiary }}>
                  {label}
                </p>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: W.primary, letterSpacing: 0.5 }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ══ 01 당일 수업 내용 ══════════════════════ */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${B.border}` }}>
          <SectionLabel num="01" title="당일 수업 내용" />
          <p style={{ margin: 0, fontSize: 15, color: B.body, lineHeight: 1.85, whiteSpace: 'pre-line' }}>
            {studyContent || '—'}
          </p>
        </div>

        {/* ══ 02 진도 현황 ═══════════════════════════ */}
        <div style={{ padding: '18px 24px', borderBottom: hasNote ? `1px solid ${B.border}` : 'none' }}>
          <SectionLabel num="02" title="내신대비 진도 현황" />
          {assignments.length > 0 ? (
            <div>
              {assignments.map((a, i) => (
                <ProgressRow key={i} name={a.name} score={a.score} isLast={i === assignments.length - 1} />
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: B.hint }}>과제 데이터 없음</p>
          )}
        </div>

        {/* ══ 03 특이사항 ════════════════════════════ */}
        {hasNote && (
          <div style={{ padding: '18px 24px' }}>
            <SectionLabel num="03" title="특이사항" />
            <p style={{ margin: 0, fontSize: 15, color: B.body, lineHeight: 1.85, whiteSpace: 'pre-line' }}>
              {specialNote}
            </p>
          </div>
        )}

        {/* ══ FOOTER ══════════════════════════════ */}
        <div style={{
          backgroundColor: B.dark,
          padding: '9px 24px',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: 10, color: W.tertiary, letterSpacing: 0.3 }}>
            Designed by Akileox
          </span>
        </div>
      </div>
    )
  }
)

StudentReportCard.displayName = 'StudentReportCard'
