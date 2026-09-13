// 엑셀 시간 셀 값(문자열/소수(하루 대비 비율)/Date)을 "HH:MM" 문자열로 정규화.
// 클리닉·내신대비 리포트 엑셀 업로드 양쪽에서 공유.
export function excelTimeToString(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') {
    const t = value.trim()
    if (/^\d{1,2}:\d{2}/.test(t)) return t
    return t
  }
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const total = Math.round(value * 24 * 60)
    const h = Math.floor(total / 60)
    const m = total % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  if (value instanceof Date) {
    const h = value.getHours()
    const m = value.getMinutes()
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  return String(value)
}
