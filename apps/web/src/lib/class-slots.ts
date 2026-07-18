// 분반 요일별 수업 시간 슬롯 유틸
// time_slots가 있으면 슬롯 기준, 없으면 기존 day_of_week/start_time/end_time 단일 시간으로 동작

export type TimeSlot = { days: number[]; start: string; end: string }

const DAY_LABEL: Record<number, string> = { 0: '일', 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토' }
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

type LegacyScheduleRow = {
  time_slots?: unknown
  day_of_week: number[] | null
  start_time: string | null
  end_time: string | null
}

// 행에서 슬롯 목록 추출 (legacy fallback 포함)
export function slotsFromRow(row: LegacyScheduleRow): TimeSlot[] {
  const raw = row.time_slots
  if (Array.isArray(raw) && raw.length > 0) {
    return (raw as TimeSlot[]).filter((s) => Array.isArray(s.days) && s.days.length > 0 && s.start && s.end)
  }
  if (row.day_of_week?.length && row.start_time && row.end_time) {
    return [{ days: row.day_of_week, start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5) }]
  }
  return []
}

// "월목 16:00~19:00 · 토일 13:00~16:00"
export function scheduleTextFromSlots(slots: TimeSlot[]): string | null {
  if (slots.length === 0) return null
  return slots
    .map((s) => {
      const days = DAY_ORDER.filter((d) => s.days.includes(d)).map((d) => DAY_LABEL[d]).join('')
      return `${days} ${s.start}~${s.end}`
    })
    .join(' · ')
}

// 다중 슬롯 분반을 슬롯별 가상 행으로 펼친다.
// 시간표·오늘 수업처럼 day_of_week/start_time/end_time을 읽는 기존 코드가
// 수정 없이 요일별 시간을 정확히 표시하게 하는 서버측 어댑터.
export function expandClassSlots<T extends LegacyScheduleRow>(rows: T[]): T[] {
  const out: T[] = []
  for (const row of rows) {
    const slots = slotsFromRow(row)
    if (slots.length <= 1) {
      out.push(row)
      continue
    }
    for (const slot of slots) {
      out.push({
        ...row,
        day_of_week: slot.days,
        start_time: slot.start,
        end_time: slot.end,
      })
    }
  }
  return out
}
