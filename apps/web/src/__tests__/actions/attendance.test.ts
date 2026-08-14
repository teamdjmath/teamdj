import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/verified-user', () => ({ getVerifiedUser: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/logger')>()
  return {
    ...actual,
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  }
})

import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { saveAttendance, getMonthlyAttendanceExport } from '@/lib/actions/attendance'
import type { AttendanceEntry } from '@/lib/actions/attendance'

const mockTeacher = { id: 'teacher-1', user_metadata: { role: 'teacher' } }

const sampleEntries: AttendanceEntry[] = [
  { studentId: 'student-1', status: 'present' },
  { studentId: 'student-2', status: 'absent', absenceReason: '병결' },
  { studentId: 'student-3', status: 'late' },
]

function makeUpsertMock(result: { error: unknown; count?: number | null }) {
  return {
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue(result),
    }),
  }
}

describe('saveAttendance', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.mocked(getVerifiedUser).mockResolvedValue(mockTeacher as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('성공 케이스 → savedCount DB count 값 반환', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeUpsertMock({ error: null, count: 3 }) as any,
    )

    const result = await saveAttendance('class-1', '2025-05-06', sampleEntries)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data?.savedCount).toBe(3)
    }
  })

  it('성공 케이스 - count null 시 entries.length 폴백', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeUpsertMock({ error: null, count: null }) as any,
    )

    const result = await saveAttendance('class-1', '2025-05-06', sampleEntries)

    expect(result.success).toBe(true)
    if (result.success) {
      // count가 null이면 rows.length(=3)을 반환
      expect(result.data?.savedCount).toBe(sampleEntries.length)
    }
  })

  it('entries 빈 배열 → 저장할 출결 데이터가 없습니다 반환', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeUpsertMock({ error: null, count: 0 }) as any,
    )

    const result = await saveAttendance('class-1', '2025-05-06', [])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('저장할 출결 데이터가 없습니다.')
    }
  })

  it('upsert 중복 - onConflict 옵션으로 재호출 시 정상 처리', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null, count: sampleEntries.length })
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ upsert: upsertMock }),
    } as any)

    // 첫 번째 저장
    const result1 = await saveAttendance('class-1', '2025-05-06', sampleEntries)
    expect(result1.success).toBe(true)

    // 동일 데이터 재저장 (중복 upsert)
    const result2 = await saveAttendance('class-1', '2025-05-06', sampleEntries)
    expect(result2.success).toBe(true)

    // onConflict 설정 확인
    const [, options] = upsertMock.mock.calls[0]
    expect(options).toMatchObject({ onConflict: 'class_id,student_id,session_date' })
  })

  it('권한 없는 역할 (parent) → 권한이 없습니다 반환', async () => {
    vi.mocked(getVerifiedUser).mockResolvedValue({ id: 'parent-1', user_metadata: { role: 'parent' } } as any)
    vi.mocked(createAdminClient).mockReturnValue(
      makeUpsertMock({ error: null, count: 0 }) as any,
    )

    const result = await saveAttendance('class-1', '2025-05-06', sampleEntries)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('권한이 없습니다.')
    }
  })

  it('ta_desk 역할도 출결 저장 가능', async () => {
    vi.mocked(getVerifiedUser).mockResolvedValue({ id: 'ta-1', user_metadata: { role: 'ta_desk' } } as any)
    vi.mocked(createAdminClient).mockReturnValue(
      makeUpsertMock({ error: null, count: sampleEntries.length }) as any,
    )

    const result = await saveAttendance('class-1', '2025-05-06', sampleEntries)

    expect(result.success).toBe(true)
  })

  it('미인증 상태 → 인증이 필요합니다 반환', async () => {
    vi.mocked(getVerifiedUser).mockResolvedValue(null)
    vi.mocked(createAdminClient).mockReturnValue(
      makeUpsertMock({ error: null, count: 0 }) as any,
    )

    const result = await saveAttendance('class-1', '2025-05-06', sampleEntries)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('인증이 필요합니다.')
    }
  })
})

// 체이닝 메서드를 전부 this 반환 + 최종적으로 await 가능(thenable)하게 만든 가짜 쿼리 빌더.
// 실제 Supabase 빌더처럼 select().eq().gte().lte() 어디서 await 하든 result로 resolve된다.
function makeThenable(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select      = chain
  builder.eq          = chain
  builder.gte         = chain
  builder.lte         = chain
  builder.maybeSingle = () => Promise.resolve(result)
  builder.then = (resolve: (v: typeof result) => void) => Promise.resolve(result).then(resolve)
  return builder
}

describe('getMonthlyAttendanceExport', () => {
  beforeEach(() => {
    vi.mocked(getVerifiedUser).mockResolvedValue({ id: 'teacher-1', user_metadata: { role: 'teacher' } } as any)
  })
  afterEach(() => vi.restoreAllMocks())

  it('출석 상태·휴원 기간·반 제외·탈퇴(이름 스냅샷)를 각각 올바르게 표기한다', async () => {
    const logs = [
      // 재원생: 정상 출석 2건
      { student_id: 'active-1', session_date: '2026-03-03', status: 'present', student_name_snapshot: null, student: { name: '김재원' } },
      { student_id: 'active-1', session_date: '2026-03-10', status: 'late',    student_name_snapshot: null, student: { name: '김재원' } },
      // 반에서 3/5에 제외된 학생: 3/3(제외 전)은 정상 출석, 3/10(제외 후)은 로그 없음
      { student_id: 'removed-1', session_date: '2026-03-03', status: 'present', student_name_snapshot: null, student: { name: '이제외' } },
      // 탈퇴생: users 행이 사라져 student가 null, snapshot으로만 이름 복원
      { student_id: null, session_date: '2026-03-03', status: 'absent', student_name_snapshot: '박탈퇴', student: null },
    ]
    const members = [
      { student_id: 'active-1',  is_active: true,  removed_at: null,
        student: { name: '김재원', suspended_from: null, suspended_until: null } },
      { student_id: 'removed-1', is_active: false, removed_at: '2026-03-05T00:00:00Z',
        student: { name: '이제외', suspended_from: null, suspended_until: null } },
      { student_id: 'susp-1',    is_active: true,  removed_at: null,
        student: { name: '최휴원', suspended_from: '2026-03-01', suspended_until: '2026-03-20' } },
    ]

    const db = {
      from: vi.fn((table: string) => {
        if (table === 'class_groups')   return makeThenable({ data: { name: '샘플반' } })
        if (table === 'attendance_logs') return makeThenable({ data: logs })
        if (table === 'class_members')   return makeThenable({ data: members })
        throw new Error(`unexpected table ${table}`)
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(db as any)

    const res = await getMonthlyAttendanceExport('class-1', 2026, 3)

    expect(res.error).toBeUndefined()
    expect(res.dates).toEqual(['2026-03-03', '2026-03-10'])

    const byName = Object.fromEntries((res.rows ?? []).map((r) => [r.studentName, r.cells]))

    // 실제 기록된 출석은 그대로
    expect(byName['김재원']).toEqual({ '2026-03-03': '출석', '2026-03-10': '지각' })
    // 탈퇴생은 이름 스냅샷으로 복원, 실제 기록은 그대로, 마지막 기록 다음 칸에 "퇴원" 1회 표기
    expect(byName['박탈퇴']).toEqual({ '2026-03-03': '결석(차감)', '2026-03-10': '퇴원' })
    // 반 제외: 제외일 이후 첫 컬럼(3/10)에 "제외" 표기
    expect(byName['이제외']).toEqual({ '2026-03-03': '출석', '2026-03-10': '제외' })
    // 휴원: 출석 기록 없는 두 컬럼 모두 "휴원" (기간이 두 날짜 다 포함)
    expect(byName['최휴원']).toEqual({ '2026-03-03': '휴원', '2026-03-10': '휴원' })
  })

  it('이번 달 시작 전에 이미 반에서 제외된 학생은 로스터에 아예 나오지 않는다', async () => {
    const logs = [
      { student_id: 'active-1', session_date: '2026-04-02', status: 'present', student_name_snapshot: null, student: { name: '김재원' } },
    ]
    const members = [
      { student_id: 'active-1', is_active: true, removed_at: null, student: { name: '김재원', suspended_from: null, suspended_until: null } },
      // 3월에 이미 제외된 학생 — 4월 로스터엔 없어야 함
      { student_id: 'old-1', is_active: false, removed_at: '2026-03-17T00:00:00Z', student: { name: '이전달제외', suspended_from: null, suspended_until: null } },
    ]

    const db = {
      from: vi.fn((table: string) => {
        if (table === 'class_groups')   return makeThenable({ data: { name: '샘플반' } })
        if (table === 'attendance_logs') return makeThenable({ data: logs })
        if (table === 'class_members')   return makeThenable({ data: members })
        throw new Error(`unexpected table ${table}`)
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(db as any)

    const res = await getMonthlyAttendanceExport('class-1', 2026, 4)

    const names = (res.rows ?? []).map((r) => r.studentName)
    expect(names).toContain('김재원')
    expect(names).not.toContain('이전달제외')
  })

  it('077 이전에 제외되어 removed_at이 없는 레거시 데이터도 빈 칸 대신 "제외"로 표기한다', async () => {
    const logs = [
      { student_id: 'legacy-1', session_date: '2026-07-10', status: 'present', student_name_snapshot: null, student: { name: '전세영' } },
      { student_id: 'legacy-1', session_date: '2026-07-12', status: 'present', student_name_snapshot: null, student: { name: '전세영' } },
      { student_id: 'active-1', session_date: '2026-07-19', status: 'present', student_name_snapshot: null, student: { name: '김재원' } },
    ]
    const members = [
      { student_id: 'active-1', is_active: true, removed_at: null, student: { name: '김재원', suspended_from: null, suspended_until: null } },
      // is_active=false인데 removed_at은 null (마이그레이션 이전 레거시 제외 데이터)
      { student_id: 'legacy-1', is_active: false, removed_at: null, student: { name: '전세영', suspended_from: null, suspended_until: null } },
    ]

    const db = {
      from: vi.fn((table: string) => {
        if (table === 'class_groups')   return makeThenable({ data: { name: '샘플반' } })
        if (table === 'attendance_logs') return makeThenable({ data: logs })
        if (table === 'class_members')   return makeThenable({ data: members })
        throw new Error(`unexpected table ${table}`)
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(db as any)

    const res = await getMonthlyAttendanceExport('class-1', 2026, 7)

    const byName = Object.fromEntries((res.rows ?? []).map((r) => [r.studentName, r.cells]))
    expect(byName['전세영']).toEqual({
      '2026-07-10': '출석',
      '2026-07-12': '출석',
      '2026-07-19': '제외', // 빈 칸이 아니라 마지막 기록(7/12) 다음 컬럼에 표기
    })
  })

  it('동명이인은 학교로 구분할 수 있게 school을 함께 반환한다', async () => {
    const logs = [
      { student_id: 'dup-1', session_date: '2026-08-14', status: 'present', student_name_snapshot: null, student: { name: '김도은', school: '대륜고' } },
      { student_id: 'dup-2', session_date: '2026-08-14', status: 'late',    student_name_snapshot: null, student: { name: '김도은', school: '세종고' } },
    ]
    const members = [
      { student_id: 'dup-1', is_active: true, removed_at: null, student: { name: '김도은', school: '대륜고', suspended_from: null, suspended_until: null } },
      { student_id: 'dup-2', is_active: true, removed_at: null, student: { name: '김도은', school: '세종고', suspended_from: null, suspended_until: null } },
    ]

    const db = {
      from: vi.fn((table: string) => {
        if (table === 'class_groups')   return makeThenable({ data: { name: '샘플반' } })
        if (table === 'attendance_logs') return makeThenable({ data: logs })
        if (table === 'class_members')   return makeThenable({ data: members })
        throw new Error(`unexpected table ${table}`)
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(db as any)

    const res = await getMonthlyAttendanceExport('class-1', 2026, 8)

    const schools = (res.rows ?? []).map((r) => r.school).sort()
    expect(schools).toEqual(['대륜고', '세종고'])
    expect(res.rows).toHaveLength(2)
  })

  it('권한 없는 역할(parent) → 권한이 없습니다 반환, DB 조회 안 함', async () => {
    vi.mocked(getVerifiedUser).mockResolvedValue({ id: 'parent-1', user_metadata: { role: 'parent' } } as any)
    const fromSpy = vi.fn()
    vi.mocked(createAdminClient).mockReturnValue({ from: fromSpy } as any)

    const res = await getMonthlyAttendanceExport('class-1', 2026, 3)

    expect(res.error).toBe('권한이 없습니다.')
    expect(fromSpy).not.toHaveBeenCalled()
  })
})
