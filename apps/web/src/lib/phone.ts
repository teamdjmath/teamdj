// 저장/조회용 정규화 — 숫자만 남김. 로그인 이메일(toAuthEmail)의 기준값과
// DB phone 컬럼을 항상 같은 형식으로 맞춰 하이픈 유무로 조회가 어긋나는 걸 방지한다.
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

// 전화번호 표시용 하이픈 포맷 — 010-1234-5678 형태로 통일
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return phone
}
