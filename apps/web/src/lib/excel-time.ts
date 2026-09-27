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
    // xlsx가 cellDates 옵션으로 만드는 Date는 엑셀 시간 값을 그대로 UTC 필드에 담은 것이라
    // (타임존 개념이 없는 값), 로컬 getHours()를 쓰면 서버 실행 타임존에 따라 시각이 밀린다
    // (예: UTC로 도는 배포 환경에서 9시간 어긋남). 반드시 UTC getter로 읽어야 한다.
    const h = value.getUTCHours()
    const m = value.getUTCMinutes()
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  return String(value)
}
