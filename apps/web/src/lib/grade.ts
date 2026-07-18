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
