'use server'

import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'
import { logger } from '@/lib/logger'
import { autoBlockForAttendanceSave } from '@/lib/actions/lectures'

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'absent_video'

export type AttendanceEntry = {
  studentId:      string
  status:         AttendanceStatus
  absenceReason?: string
}

export async function saveAttendance(
  classId: string,
  sessionDate: string,
  entries: AttendanceEntry[],
): Promise<ActionResult<{ savedCount: number }>> {
  const user = await getVerifiedUser()

  return withAction('saveAttendance', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }
    if (!entries.length) return { success: false, error: '저장할 출결 데이터가 없습니다.' }

    const rows = entries.map((e) => ({
      class_id:       classId,
      student_id:     e.studentId,
      session_date:   sessionDate,
      status:         e.status,
      absence_reason: e.absenceReason ?? null,
    }))

    const adminSupabase = createAdminClient()
    const { error, count } = await adminSupabase
      .from('attendance_logs')
      .upsert(rows, { onConflict: 'class_id,student_id,session_date', count: 'exact' })
    if (error) throw error

    // 강의가 출석체크보다 먼저 등록돼있던 경우 대비 — 방금 저장한 날짜의 강의들을 다시 스캔해
    // 결석(차감) 학생을 뒤늦게라도 자동 차단한다. 출석 저장 자체를 막으면 안 되므로 실패해도 무시.
    await autoBlockForAttendanceSave(classId, sessionDate).catch((e) => {
      logger.error('saveAttendance:auto-block-failed', { action: 'saveAttendance', userId: user.id, error: e })
    })

    revalidatePath('/admin/attendance')
    return { success: true, data: { savedCount: count ?? rows.length } }
  })
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: '출석', late: '지각', absent: '결석(차감)', absent_video: '결석(영상)',
}

export type AttendanceExportRow = {
  studentName: string
  school: string // 동명이인 구분용 — 탈퇴생은 스냅샷이 없어 빈 문자열일 수 있음
  cells: Record<string, string> // session_date(yyyy-mm-dd) → 셀 표기
}

export type AttendanceExportResult = {
  error?: string
  className?: string
  dates?: string[]
  rows?: AttendanceExportRow[]
}

// 분반의 한 달치 출석 기록을 학생×수업날짜 표로 취합 (엑셀 내보내기용).
// 컬럼(수업날짜)은 그 달 실제로 출석체크가 입력된 날짜만 사용 — 휴강/스케줄은 사무팀이 별도 처리.
// 휴원 기간은 "휴원", 반에서 제외된 이후는 "제외", 회원 탈퇴 이후는 "퇴원"을 표기 첫 칸에 한 번만
// 남기고 그 뒤는 빈 칸으로 둔다. 탈퇴한 학생은 users 행이 사라져도 attendance_logs의
// student_name_snapshot(탈퇴 처리 시 기록됨)으로 이름을 복원한다.
export async function getMonthlyAttendanceExport(
  classId: string,
  year: number,
  month: number, // 1-12
): Promise<AttendanceExportResult> {
  const user = await getVerifiedUser()
  if (!user) return { error: '인증이 필요합니다.' }
  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) return { error: '권한이 없습니다.' }

  const admin = createAdminClient()
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd   = new Date(year, month, 0).toISOString().slice(0, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  const [{ data: cls }, { data: logs }, { data: members }] = await Promise.all([
    db.from('class_groups').select('name').eq('id', classId).maybeSingle(),
    db.from('attendance_logs')
      .select('student_id, session_date, status, student_name_snapshot, student:users!student_id(name, school)')
      .eq('class_id', classId)
      .gte('session_date', monthStart)
      .lte('session_date', monthEnd),
    db.from('class_members')
      .select('student_id, is_active, removed_at, student:users!student_id(name, school, suspended_from, suspended_until)')
      .eq('class_id', classId),
  ])

  if (!cls) return { error: '분반을 찾을 수 없습니다.' }

  const dates = [...new Set((logs ?? []).map((l: Record<string, unknown>) => l.session_date as string))].sort() as string[]
  const className = cls.name as string
  if (dates.length === 0) return { className, dates: [], rows: [] }

  type Agg = {
    name: string
    school: string // 동명이인 구분용 (탈퇴생은 스냅샷이 없어 빈 문자열)
    cells: Map<string, string>
    suspendedFrom: string | null
    suspendedUntil: string | null
    removedAt: string | null
    isMember: boolean  // false면 class_members에 매칭 안 됨 = 탈퇴(계정 삭제)한 학생
    isActive: boolean  // isMember인데 false면 반에서 제외됐지만 removed_at이 없는 레거시 데이터
  }
  const byKey = new Map<string, Agg>()
  function getAgg(key: string, name: string): Agg {
    let a = byKey.get(key)
    if (!a) {
      a = { name, school: '', cells: new Map(), suspendedFrom: null, suspendedUntil: null, removedAt: null, isMember: false, isActive: true }
      byKey.set(key, a)
    }
    return a
  }

  for (const log of (logs ?? []) as Record<string, unknown>[]) {
    const sid     = log.student_id as string | null
    const student = log.student as { name?: string; school?: string | null } | null
    const name = student?.name ?? log.student_name_snapshot as string | null ?? '알 수 없음'
    const key = sid ?? `withdrawn:${name}`
    const agg = getAgg(key, name)
    if (student?.school) agg.school = student.school
    agg.cells.set(log.session_date as string, STATUS_LABEL[log.status as AttendanceStatus] ?? String(log.status))
  }

  for (const m of (members ?? []) as Record<string, unknown>[]) {
    const removedAt = m.removed_at as string | null
    if (removedAt && removedAt.slice(0, 10) < monthStart) continue // 이번 달 되기 전에 이미 제외 → 로스터에서 빠짐

    const sid     = m.student_id as string
    const student = m.student as { name?: string; school?: string | null; suspended_from?: string | null; suspended_until?: string | null } | null
    const agg = getAgg(sid, student?.name ?? '알 수 없음')
    agg.isMember       = true
    agg.isActive       = m.is_active as boolean
    agg.school         = student?.school ?? agg.school
    agg.suspendedFrom  = student?.suspended_from ?? null
    agg.suspendedUntil = student?.suspended_until ?? null
    agg.removedAt      = removedAt
  }

  const rows: AttendanceExportRow[] = [...byKey.values()]
    .sort((a, b) => a.name.localeCompare(b.name, 'ko') || a.school.localeCompare(b.school, 'ko'))
    .map((agg) => {
      let markedSpecial = false
      for (const date of dates) {
        if (agg.cells.has(date)) continue

        if (agg.suspendedFrom && agg.suspendedUntil && date >= agg.suspendedFrom && date <= agg.suspendedUntil) {
          agg.cells.set(date, '휴원')
          continue
        }
        if (agg.removedAt && date >= agg.removedAt.slice(0, 10)) {
          if (!markedSpecial) { agg.cells.set(date, '제외'); markedSpecial = true }
          continue
        }
        // removed_at 없이 비활성인 레거시 데이터 대비 안전장치 — 마지막 실제 기록 다음 칸에 추정 표기
        if (agg.isMember && !agg.isActive && !agg.removedAt) {
          const lastRecorded = [...agg.cells.keys()].sort().at(-1)
          if (lastRecorded && date > lastRecorded && !markedSpecial) {
            agg.cells.set(date, '제외')
            markedSpecial = true
          }
          continue
        }
        if (!agg.isMember) {
          const lastRecorded = [...agg.cells.keys()].sort().at(-1)
          if (lastRecorded && date > lastRecorded && !markedSpecial) {
            agg.cells.set(date, '퇴원')
            markedSpecial = true
          }
          continue
        }
      }
      return { studentName: agg.name, school: agg.school, cells: Object.fromEntries(agg.cells) }
    })

  return { className, dates, rows }
}
