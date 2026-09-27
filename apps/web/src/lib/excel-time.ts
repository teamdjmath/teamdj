// 엑셀 시간 셀 값(문자열 또는 소수(하루 대비 비율))을 "HH:MM" 문자열로 정규화.
// 클리닉·내신대비 리포트 엑셀 업로드 양쪽에서 공유.
//
// Date 값은 절대 처리하지 않는다 — 호출 쪽 XLSX.read()가 cellDates 옵션을 켜면 안 되기 때문.
// 시간 셀을 Date로 바꾸면, 엑셀의 시간 전용 셀이 쓰는 가짜 기준일(1899-12-30)이 서울 표준시
// 도입(1912년) 이전 날짜라, 로컬 시간대 변환 시 정각이 아닌 서울 LMT(+8:27:52)가 적용되어
// getHours()/getUTCHours() 어느 쪽을 쓰든 서버 실행 환경(타임존)에 따라 값이 틀어진다.
// (실제로 18:00을 09:32로 잘못 표시하는 버그가 났던 원인 — 커밋 참고)
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
  return String(value)
}
