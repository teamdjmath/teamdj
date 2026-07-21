import { type RefObject } from 'react'
import type { ExamReportContent } from '@/lib/actions/exam-reports'
import { gradeSystemOf } from '@/lib/grade'

export type ExamReportCardData = {
  content: ExamReportContent
  generatedAt?: string
}

interface Props {
  data: ExamReportCardData
  cardRef?: RefObject<HTMLDivElement | null>
}

// 흑백 톤 + 포인트 컬러 하나만 — 사이트 전역에서 이미 강조색으로 쓰는 emerald와 통일.
// 회색 두 단계 모두 흰 배경 대비를 충분히 확보하도록 어둡게 잡는다 (연한 회색은 안 읽힘).
const C = {
  ink:    '#111111',
  body:   '#1d1c19',
  sub:    '#45433c', // 부제·보조 정보 — 본문급 대비 확보
  muted:  '#726f63', // 정말 부차적인 것만 (푸터 등) — 그래도 최소 대비는 지킨다
  border: '#e3e1d7',
  paper:  '#fdfcfa', // 순백 대신 아주 옅은 종이톤 — 분석 노트 질감
  white:  '#ffffff',
}
const ACCENT      = '#047857' // emerald-700
const ACCENT_FILL = '#059669' // emerald-600

function formatAdminDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: 0,
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: '0.09em',
      color: C.muted,
      textTransform: 'uppercase' as const,
    }}>
      {children}
    </p>
  )
}

// 등급컷 위치 바 — 점수 0→만점을 왼쪽→오른쪽 수직선으로 두고(핀 위치 계산과 동일한 축),
// 등급 구간도 그 축 위에 정렬한다: 1등급(고득점 구간)이 오른쪽, 최하 등급이 왼쪽.
// 색은 "이 학생의 구간"에만 유일한 포인트 컬러를 쓴다.
function GradeCutBar({ score, maxScore, gradeCuts }: { score: number; maxScore: number; gradeCuts: Record<string, number> }) {
  const grades = Object.keys(gradeCuts).map(Number).sort((a, b) => a - b)
  if (grades.length === 0 || maxScore <= 0) return null

  const system = gradeSystemOf(gradeCuts)
  // segments[0] = 최하 등급(0점 쪽, 왼쪽) … segments[last] = 1등급(만점 쪽, 오른쪽)
  const boundaries = [0, ...[...grades].reverse().map((g) => gradeCuts[String(g)]), maxScore]
  const segCount = boundaries.length - 1 // grades.length + 1 (최하 등급 구간 포함)
  const scorePct = Math.max(0, Math.min(100, (score / maxScore) * 100))

  // 학생 등급 번호(1이 최상) — gradeFromScore와 동일 규칙으로 판정 후 세그먼트 인덱스로 환산
  let myGradeNum = grades.length + 1 // 기본: 최하 등급
  for (const g of grades) {
    if (score >= gradeCuts[String(g)]) { myGradeNum = g; break }
  }
  const myGradeIdx = segCount - myGradeNum

  return (
    <div>
      <div style={{ position: 'relative', height: 26, marginTop: 28 }}>
        {/* 점수 핀 — 말풍선 대신 점 + 세로 가이드선 + 라벨 (분석 차트의 데이터 포인트 표기 방식) */}
        <div style={{ position: 'absolute', left: `${scorePct}%`, top: -19, transform: 'translateX(-50%)', textAlign: 'center' as const, zIndex: 1 }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: C.ink, whiteSpace: 'nowrap' as const }}>{score}점</span>
          <div style={{ width: 1, height: 8, backgroundColor: C.ink, margin: '2px auto 0' }} />
          <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: C.ink, margin: '-1.5px auto 0' }} />
        </div>

        <div style={{ display: 'flex', gap: 2, height: 16, marginTop: 18 }}>
          {Array.from({ length: segCount }).map((_, i) => {
            const lo = boundaries[i]
            const hi = boundaries[i + 1]
            const widthPct = ((hi - lo) / maxScore) * 100
            const isMine = i === myGradeIdx
            return (
              <div
                key={i}
                style={{
                  width: `${widthPct}%`,
                  minWidth: 4,
                  backgroundColor: isMine ? ACCENT_FILL : '#e6e4da',
                  borderRadius: i === 0 ? '3px 0 0 3px' : i === segCount - 1 ? '0 3px 3px 0' : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {widthPct > 7 && (
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: isMine ? C.white : '#8c8a7e' }}>
                    {segCount - i}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 10.5, color: C.sub, lineHeight: 1.5, letterSpacing: '0.01em' }}>
        {system}등급제 · {grades.map((g) => `${g}등급 ${gradeCuts[String(g)]}점`).join('  ·  ')}
      </p>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: C.border, margin: '24px 0 0' }} />
}

export function ExamReportCard({ data, cardRef }: Props) {
  const c = data.content
  const grade = c.examGrade
  const infoLine = [c.school, c.studentGrade && `${c.studentGrade}학년`, c.className].filter(Boolean).join(' · ')

  return (
    <div
      ref={cardRef as RefObject<HTMLDivElement | null>}
      style={{
        width: 460,
        backgroundColor: C.paper,
        color: C.body,
        fontFamily: "'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif",
        boxSizing: 'border-box' as const,
        border: `1px solid ${C.border}`,
      }}
    >
      {/* 헤더 */}
      <div style={{ backgroundColor: C.ink, padding: '13px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
          fontSize: 13, fontWeight: 900, letterSpacing: '-0.04em',
          textTransform: 'uppercase' as const, color: '#ffffff', fontStyle: 'italic' as const,
        }}>
          TeamDJ
        </span>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' as const }}>
          Analysis Note
        </span>
      </div>

      <div style={{ padding: '26px 26px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, backgroundColor: ACCENT, display: 'inline-block' }} />
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', color: ACCENT, textTransform: 'uppercase' as const }}>
            특별시험 레포트 · 개발 중
          </span>
        </div>
        <h1 style={{ margin: '12px 0 0', fontSize: 21, fontWeight: 800, color: C.ink, lineHeight: 1.3, letterSpacing: '-0.015em' }}>
          {c.examName}
        </h1>
        <p style={{ margin: '5px 0 0', fontSize: 12, color: C.sub }}>
          {c.examType} · {formatAdminDate(c.examDate)}
        </p>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{c.studentName}</span>
          {infoLine && <span style={{ fontSize: 12, color: C.sub }}>{infoLine}</span>}
        </div>
      </div>

      <Divider />

      {/* 핵심 지표 */}
      <div style={{ padding: '24px 26px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 46, fontWeight: 800, color: C.ink, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' as const }}>
            {c.score}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.sub }}>/ {c.maxScore}점</span>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' as const, flexWrap: 'wrap' as const }}>
            {grade && (
              <span style={{
                borderRadius: 5, padding: '5px 12px', fontSize: 12, fontWeight: 800,
                backgroundColor: ACCENT_FILL, color: C.white,
              }}>
                {grade}
              </span>
            )}
            {c.rankInExam != null && (
              <span style={{
                borderRadius: 5, padding: '5px 12px', fontSize: 12, fontWeight: 800,
                color: C.ink, border: `1px solid ${C.border}`,
              }}>
                원내 {c.rankInExam}/{c.totalInExam ?? '?'}등
              </span>
            )}
          </div>
        </div>

        {Object.keys(c.gradeCuts).length > 0 && (
          <GradeCutBar score={c.score} maxScore={c.maxScore} gradeCuts={c.gradeCuts} />
        )}
      </div>

      {/* 예측 등급 */}
      {c.estimatedGrade && (
        <div style={{ padding: '26px 26px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, paddingBottom: 13, borderBottom: `1px solid ${C.border}` }}>
            <SectionLabel>예측 등급 (학교·전국 추정)</SectionLabel>
            <span style={{ fontSize: 15, fontWeight: 800, color: ACCENT }}>
              {c.estimatedGrade}
              {c.estimatedPercentile != null && (
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: C.sub }}>
                  상위 {c.estimatedPercentile}%
                </span>
              )}
            </span>
          </div>
          <p style={{ margin: '11px 0 0', fontSize: 10.5, lineHeight: 1.7, color: C.muted }}>
            학원 내 응시자 성적 분포를 바탕으로 통계적으로 추정한 값입니다. 실제 학교·전국 등급과
            다를 수 있으며, 학원 내 등수·등급은 위에 별도로 표기되어 있습니다.
          </p>
        </div>
      )}

      {/* 선생님 분석 */}
      <div style={{ padding: '26px 26px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 13, borderBottom: `1px solid ${C.border}` }}>
          <SectionLabel>선생님 분석</SectionLabel>
        </div>
        {c.studySuggestion?.trim() ? (
          <p style={{ margin: '13px 0 0', fontSize: 13, lineHeight: 1.95, color: C.body, whiteSpace: 'pre-wrap' as const }}>
            {c.studySuggestion}
          </p>
        ) : (
          <p style={{ margin: '13px 0 0', fontSize: 12.5, color: C.muted, fontStyle: 'italic' as const }}>
            아직 작성된 분석이 없습니다.
          </p>
        )}
      </div>

      {/* 푸터 */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: '13px 26px', textAlign: 'center' as const }}>
        <p style={{ margin: 0, fontSize: 9.5, color: C.muted, letterSpacing: '0.04em' }}>
          TeamDJ 학습분석 · {formatAdminDate(data.generatedAt ?? new Date().toISOString())} 생성
        </p>
      </div>
    </div>
  )
}
