// 등급 계산 공용 유틸 — 관리자 특별시험 관리 / 학생 리포트에서 공유
// 등급 체계는 저장된 컷 개수로 판별: 5등급제(1~4등급 컷) vs 9등급제(1~8등급 컷)
// 고1·2(22개정)=5등급제, 현 고3(15개정)=9등급제

export function gradeSystemOf(gradeCuts: Record<string, number>): 5 | 9 {
  return Object.keys(gradeCuts).some((k) => Number(k) >= 5) ? 9 : 5
}

export function gradeFromScore(score: number, gradeCuts: Record<string, number>): string | null {
  if (Object.keys(gradeCuts).length === 0) return null
  const maxGrade = gradeSystemOf(gradeCuts)
  for (let g = 1; g < maxGrade; g++) {
    const cut = gradeCuts[String(g)]
    if (cut !== undefined && score >= cut) return `${g}등급`
  }
  return `${maxGrade}등급`
}

// ════════════════════════════════════════════════════════════════
// 예상 등급 — 학원 내부 등급컷(gradeFromScore)과는 별개의 통계적 추정치
//
// 학원 내 등수는 그 시험을 본 소수 인원(수십 명) 안에서의 순위일 뿐,
// 실제 "등급"은 학교·전국 단위의 훨씬 큰 모집단에서 정해진다. 그 모집단 성적을
// 알 수 없으므로, 이 시험 응시자 집단의 점수 분포(평균·표준편차)가 정규분포를
// 따른다고 가정하고 z-score → 표준정규분포 누적확률로 "상위 몇 %"를 역산해
// 국가 relative-evaluation 등급 구간에 대입한다. 표본이 작을수록(학원 인원만큼)
// 오차가 커지므로 반드시 "추정치" 고지와 함께 노출해야 한다.
// ════════════════════════════════════════════════════════════════

// 9등급제 relative evaluation 누적 상위 비율 컷 (표준 등급별 비율: 4/7/12/17/20/17/12/7/4)
const GRADE_BANDS_9 = [4, 11, 23, 40, 60, 77, 89, 96, 100]
// 5등급제(2022 개정교육과정 내신) 누적 상위 비율 컷 (10/24/32/24/10)
const GRADE_BANDS_5 = [10, 34, 66, 90, 100]

function gradeBandsOf(system: 5 | 9): number[] {
  return system === 9 ? GRADE_BANDS_9 : GRADE_BANDS_5
}

// 표준정규분포 누적분포함수 P(Z <= z) — Abramowitz & Stegun 7.1.26 근사 (오차 < 1.5e-7)
function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.SQRT2
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const t = 1 / (1 + p * x)
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return 0.5 * (1 + sign * y)
}

// 상위 백분위(%) → 등급 문자열
export function gradeFromPercentile(percentileFromTop: number, system: 5 | 9): string {
  const bands = gradeBandsOf(system)
  for (let g = 0; g < bands.length; g++) {
    if (percentileFromTop <= bands[g]) return `${g + 1}등급`
  }
  return `${bands.length}등급`
}

export type EstimatedGrade = { grade: string; percentile: number }

// 시험 응시자 전체 점수로 평균·표준편차를 구해 특정 학생의 예상 등급을 산출.
// 응시자가 2명 미만이면(표준편차 계산 불가) null.
export function estimateGrade(score: number, allScores: number[], system: 5 | 9): EstimatedGrade | null {
  const n = allScores.length
  if (n < 2) return null
  const mean = allScores.reduce((a, b) => a + b, 0) / n
  const variance = allScores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / n
  const stdDev = Math.sqrt(variance)
  const z = stdDev > 0 ? (score - mean) / stdDev : 0
  const percentileFromTop = Math.round((1 - normalCdf(z)) * 1000) / 10
  return { grade: gradeFromPercentile(percentileFromTop, system), percentile: percentileFromTop }
}
