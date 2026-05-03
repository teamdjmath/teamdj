import type { RefObject } from 'react'
import type { ReportContent } from '@/lib/actions/reports'

export type ReportCardData = {
  studentName: string
  className: string
  reportDate: string
  content: ReportContent
}

interface Props {
  data: ReportCardData
  cardRef?: RefObject<HTMLDivElement | null>
}

// 원형 게이지 (SVG)
function CircleGauge({
  value,
  max,
  label,
  unit = '',
}: {
  value: number
  max: number
  label: string
  unit?: string
}) {
  const r = 44
  const cx = 56
  const cy = 56
  const circumference = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const dashLen = (pct / 100) * circumference

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={112} height={112} viewBox="0 0 112 112">
        {/* 배경 트랙 */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke="#e4e4e7" strokeWidth={10}
        />
        {/* 진행 */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke="#18181b" strokeWidth={10}
          strokeDasharray={`${dashLen} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {/* 값 */}
        <text
          x={cx} y={cy - 5}
          textAnchor="middle"
          fontSize={22}
          fontWeight="800"
          fill="#18181b"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {value}
        </text>
        {/* 단위/최대 */}
        <text
          x={cx} y={cy + 16}
          textAnchor="middle"
          fontSize={11}
          fill="#a1a1aa"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {unit || `/ ${max}`}
        </text>
      </svg>
      <span style={{ fontSize: 11, color: '#71717a', fontWeight: 500 }}>{label}</span>
    </div>
  )
}

// 출석 뱃지
function AttendanceBadge({ label, count, highlight }: { label: string; count: number; highlight?: boolean }) {
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
      gap: 2, minWidth: 44,
    }}>
      <span style={{
        fontSize: 18, fontWeight: 800,
        color: highlight ? '#18181b' : '#a1a1aa',
      }}>
        {count}
      </span>
      <span style={{ fontSize: 10, color: '#a1a1aa', fontWeight: 500 }}>{label}</span>
    </div>
  )
}

// 텍스트 섹션
function Section({ icon, title, content }: { icon: string; title: string; content: string }) {
  if (!content.trim()) return null
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#3f3f46', letterSpacing: 0.3 }}>
          {title}
        </span>
      </div>
      <p style={{
        fontSize: 12, color: '#52525b', lineHeight: 1.7, margin: 0,
        paddingLeft: 19, whiteSpace: 'pre-wrap',
      }}>
        {content}
      </p>
    </div>
  )
}

export function ReportCard({ data, cardRef }: Props) {
  const { studentName, className, reportDate, content } = data
  const { attendanceSummary: att, recentScores, avgAssignmentPct } = content

  const latestScore = recentScores.length > 0 ? recentScores[0] : null
  const scoreValue = latestScore ? Math.round(latestScore.score) : 0
  const scoreMax = 100

  // 출석률 계산
  const presentPct = att.total > 0 ? Math.round((att.present / att.total) * 100) : 0

  return (
    <div
      ref={cardRef as RefObject<HTMLDivElement>}
      style={{
        width: 480,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        border: '1px solid #e4e4e7',
      }}
    >
      {/* ── 헤더 */}
      <div style={{
        backgroundColor: '#09090b',
        padding: '20px 24px 20px',
        color: '#ffffff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.5 }}>Team</span>
            <span style={{
              fontSize: 11, fontWeight: 700, backgroundColor: '#ffffff',
              color: '#09090b', borderRadius: 4, padding: '2px 6px', letterSpacing: 0.5,
            }}>DJ</span>
          </div>
          <span style={{ fontSize: 11, color: '#a1a1aa' }}>{reportDate}</span>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.2 }}>
            {studentName}
          </div>
          <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 3 }}>{className}</div>
        </div>
      </div>

      {/* ── 출석 요약 바 */}
      <div style={{
        backgroundColor: '#f4f4f5',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        borderBottom: '1px solid #e4e4e7',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#71717a', fontWeight: 600 }}>출석 현황</span>
        </div>
        <div style={{ width: 1, height: 20, backgroundColor: '#d4d4d8' }} />
        <div style={{ display: 'flex', gap: 20 }}>
          <AttendanceBadge label="출석" count={att.present} highlight />
          <AttendanceBadge label="지각" count={att.late} />
          <AttendanceBadge label="결석" count={att.absent} />
          <AttendanceBadge label="총수업" count={att.total} />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: presentPct >= 90 ? '#18181b' : presentPct >= 70 ? '#71717a' : '#ef4444',
          }}>
            {presentPct}%
          </span>
        </div>
      </div>

      {/* ── 게이지 섹션 */}
      <div style={{
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'center',
        gap: 40,
        borderBottom: '1px solid #e4e4e7',
        backgroundColor: '#ffffff',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <CircleGauge
            value={scoreValue}
            max={scoreMax}
            label="최근 테스트"
          />
          {latestScore && (
            <span style={{ fontSize: 10, color: '#a1a1aa', marginTop: -2 }}>
              {latestScore.date}
              {latestScore.difficulty && ` · 난이도 ${latestScore.difficulty}`}
            </span>
          )}
        </div>

        {/* 구분선 */}
        <div style={{ width: 1, backgroundColor: '#e4e4e7', alignSelf: 'stretch' }} />

        <CircleGauge
          value={Math.round(avgAssignmentPct)}
          max={100}
          label="과제 완료율"
          unit="%"
        />
      </div>

      {/* ── 점수 히스토리 (최근 3개) */}
      {recentScores.length > 1 && (
        <div style={{
          padding: '10px 24px 12px',
          borderBottom: '1px solid #e4e4e7',
          backgroundColor: '#fafafa',
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#a1a1aa', letterSpacing: 0.5 }}>
            최근 점수 기록
          </span>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {recentScores.slice(0, 4).map((s, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '5px 10px',
                backgroundColor: i === 0 ? '#18181b' : '#f4f4f5',
                borderRadius: 8,
                minWidth: 50,
              }}>
                <span style={{
                  fontSize: 14, fontWeight: 800,
                  color: i === 0 ? '#ffffff' : '#3f3f46',
                }}>
                  {Math.round(s.score)}
                </span>
                <span style={{
                  fontSize: 9, marginTop: 1,
                  color: i === 0 ? '#a1a1aa' : '#a1a1aa',
                }}>
                  {s.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 텍스트 섹션 */}
      <div style={{ padding: '18px 24px 4px', backgroundColor: '#ffffff' }}>
        <Section icon="📚" title="이번 시간 학습 내용" content={content.studyContent} />
        <Section icon="📝" title="다음 시간 과제" content={content.homework} />
        <Section icon="📌" title="특이사항" content={content.notes} />
        <Section icon="📢" title="공지사항" content={content.announcement} />
      </div>

      {/* ── 푸터 */}
      <div style={{
        padding: '12px 24px',
        backgroundColor: '#fafafa',
        borderTop: '1px solid #e4e4e7',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: '#a1a1aa' }}>© {new Date().getFullYear()} TeamDJ</span>
        <span style={{ fontSize: 10, color: '#d4d4d8' }}>학습 리포트</span>
      </div>
    </div>
  )
}
