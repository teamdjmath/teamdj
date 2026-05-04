import { useId, type RefObject } from 'react'
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

// ── 가상 데이터 URL (Pretendard 폰트 시뮬레이션 및 로드 보장)
const PRETENDARD_URL = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css'

function ArcGauge({
  value,
  max,
  label,
  unit = '',
  gradientColors,
  details,
}: {
  value: number
  max: number
  label: string
  unit?: string
  gradientColors: [string, string, string]
  details?: React.ReactNode
}) {
  // 270도 호의 길이 (반지름 80일 때 약 377)
  const totalLength = 377 
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const dashOffset = totalLength - (totalLength * pct) / 100

  const id = useId()
  const gradId = `grad-${label.replace(/\s+/g, '-')}-${id.replace(/:/g, '')}`
  const filterId = `glow-${label.replace(/\s+/g, '-')}-${id.replace(/:/g, '')}`

  return (
    <div style={{
      flex: 1,
      background: 'rgba(255, 255, 255, 0.08)',
      borderRadius: 32,
      border: '1px solid rgba(255, 255, 255, 0.15)',
      padding: '40px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
    }}>
      <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'rgba(255, 255, 255, 0.65)', letterSpacing: 1, marginBottom: 20 }}>
        {label}
      </h3>
      <div style={{ position: 'relative', width: 320, height: 320, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', position: 'absolute' }}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="50%" stopColor={gradientColors[1]} />
              <stop offset="100%" stopColor={gradientColors[2]} />
            </linearGradient>
            <filter id={filterId} x="-20%" y="-20%" width={140} height={140}>
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* 트랙 */}
          <path
            d="M 43.43 156.57 A 80 80 0 1 1 156.57 156.57"
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={16}
            strokeLinecap="round"
          />
          {/* 진행바 */}
          <path
            d="M 43.43 156.57 A 80 80 0 1 1 156.57 156.57"
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={16}
            strokeLinecap="round"
            strokeDasharray={totalLength}
            strokeDashoffset={dashOffset}
            filter={`url(#${filterId})`}
          />
        </svg>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: -20 }}>
          <span style={{ fontSize: 80, fontWeight: 800, letterSpacing: -2 }}>{value}</span>
          <span style={{ fontSize: 28, fontWeight: 600, color: 'rgba(255, 255, 255, 0.65)', marginLeft: 4 }}>{unit}</span>
        </div>
      </div>
      {details && (
        <div style={{ color: '#6c757d', fontSize: 16, marginTop: 20, lineHeight: 1.6, textAlign: 'center', fontWeight: 500 }}>
          {details}
        </div>
      )}
    </div>
  )
}

export function ReportCard({ data, cardRef }: Props) {
  const { studentName, school, grade, className, reportDate, content } = data
  const { todayAttendance, recentScore, avgAssignmentPct } = content

  const scoreValue = recentScore?.score ?? 0
  const totalQ = recentScore?.totalQ ?? 100
  const scorePercent = totalQ > 0 ? (scoreValue / totalQ) * 100 : scoreValue
  
  // 날짜 표시용
  const dateObj = new Date(reportDate)
  const dateDisplay = !isNaN(dateObj.getTime())
    ? `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`
    : reportDate

  return (
    <div style={{ position: 'relative' }}>
      <link rel="stylesheet" href={PRETENDARD_URL} crossOrigin="anonymous" />
      <div
        ref={cardRef as RefObject<HTMLDivElement>}
        style={{
          width: 1080,
          minHeight: 1560,
          backgroundColor: '#05070e',
          fontFamily: '"Pretendard", sans-serif',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          padding: '70px 60px 50px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 36,
        }}
      >
        {/* Background Glows */}
        <div style={{
          position: 'absolute', top: -200, left: -200, width: 800, height: 800,
          background: 'radial-gradient(circle, rgba(28, 45, 90, 0.5) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(120px)', opacity: 0.8, zIndex: 0
        }} />
        <div style={{
          position: 'absolute', bottom: -150, right: -150, width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(50, 20, 70, 0.4) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(120px)', opacity: 0.8, zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          {/* 1. HERO CARD */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 32,
            padding: '45px 50px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 40
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5, color: '#ffffff' }}>TeamDJ</div>
              <div style={{ fontSize: 24, fontWeight: 500, color: 'rgba(255, 255, 255, 0.65)' }}>학생 학습 리포트</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                  <h1 style={{ margin: 0, fontSize: 64, fontWeight: 800, letterSpacing: -1 }}>{studentName}</h1>
                  <span style={{
                    padding: '12px 24px',
                    borderRadius: 100,
                    fontSize: 26,
                    fontWeight: 800,
                    marginLeft: 20,
                    backgroundColor: todayAttendance === 'present' ? 'rgba(0, 255, 128, 0.15)' : todayAttendance === 'absent' ? 'rgba(255, 64, 64, 0.15)' : 'rgba(255, 165, 0, 0.15)',
                    color: todayAttendance === 'present' ? '#00FF80' : todayAttendance === 'absent' ? '#FF4040' : '#FFA500',
                    border: `2px solid ${todayAttendance === 'present' ? 'rgba(0, 255, 128, 0.3)' : todayAttendance === 'absent' ? 'rgba(255, 64, 64, 0.3)' : 'rgba(255, 165, 0, 0.3)'}`
                  }}>
                    {todayAttendance === 'present' ? '출석' : todayAttendance === 'absent' ? '결석' : '지각'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 22, fontWeight: 500, color: 'rgba(255, 255, 255, 0.65)' }}>
                  <span>{school} {grade} {className}</span>
                </div>
                <div style={{ fontSize: 26, color: '#ffffff', fontWeight: 600, marginTop: 10 }}>{dateDisplay}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 40px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500 }}>결석 사유</span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
                    {todayAttendance === 'absent' || todayAttendance === 'late' ? (content.absenceReason || '-') : '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500 }}>과제 이행</span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
                    {avgAssignmentPct >= 90 ? '완료' : avgAssignmentPct >= 50 ? '부분 완료' : '미흡'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. KPI SECTION */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, paddingLeft: 10 }}>오늘의 핵심 지표</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
              <ArcGauge
                label="테스트 결과"
                value={Math.round(scorePercent)}
                max={100}
                unit="점"
                gradientColors={['#89CFF0', '#0066FF', '#00FFFF']}
                details={
                  recentScore ? (
                    <>
                      전체 문항수: <span style={{ color: '#fff', fontWeight: 700 }}>{recentScore.totalQ ?? '-'}</span>,
                      객관식: <span style={{ color: '#fff', fontWeight: 700 }}>{recentScore.objQ ?? '-'}</span>,
                      주관식: <span style={{ color: '#fff', fontWeight: 700 }}>{recentScore.subjQ ?? '-'}</span><br />
                      난이도: <span style={{ color: '#fff', fontWeight: 700 }}>{recentScore.difficulty ?? '-'}</span> |
                      학급 평균: <span style={{ color: '#fff', fontWeight: 700 }}>{recentScore.classAverage ?? '-'}</span>
                    </>
                  ) : (
                    <span style={{ color: '#6c757d' }}>테스트 데이터가 없습니다.</span>
                  )
                }
              />
              <ArcGauge
                label="이전 시간 과제 이행도"
                value={Math.round(avgAssignmentPct)}
                max={100}
                unit="%"
                gradientColors={['#FFD700', '#FFA500', '#FF69B4']}
                details={
                  <>
                    이전 시간 과제: <span style={{ color: '#fff', fontWeight: 700 }}>{content.lastAssignmentTitle || '—'}</span>
                  </>
                }
              />
            </div>
          </div>

          {/* 3. MAIN LESSON SECTION */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, paddingLeft: 10 }}>이번 시간 학습 내용</h2>
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 32,
              padding: '35px 40px',
              fontSize: 22,
              lineHeight: 1.6,
              color: '#eeeeee',
              whiteSpace: 'pre-line'
            }}>
              {content.studyContent}
            </div>
          </div>

          {/* 4. NOTES SECTION */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, paddingLeft: 10 }}>전달 사항</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <NoteCard label="다음 시간 과제" content={content.homework} />
              <NoteCard label="특이사항" content={content.notes} />
              <NoteCard label="공지사항" content={content.announcement} />
            </div>
          </div>

          {/* 5. FOOTER */}
          <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: 16, fontWeight: 500, color: 'rgba(255, 255, 255, 0.3)', letterSpacing: 2 }}>
            ⓒ Designed by SeungMin Lee
          </div>

        </div>
      </div>
    </div>
  )
}

function NoteCard({ label, content }: { label: string; content?: string }) {
  if (!content?.trim()) return null
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: 20,
      padding: '24px 30px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 24
    }}>
      <div style={{ minWidth: 130, fontSize: 18, fontWeight: 700, color: 'rgba(255, 255, 255, 0.65)', marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: '#fff', lineHeight: 1.5, whiteSpace: 'pre-line', flex: 1 }}>{content}</div>
    </div>
  )
}
