import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/logger')>()
  return {
    ...actual,
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  }
})

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { saveAttendance } from '@/lib/actions/attendance'
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

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockTeacher }, error: null }),
      },
    } as any)
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
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'parent-1', user_metadata: { role: 'parent' } } },
          error: null,
        }),
      },
    } as any)
    vi.mocked(createAdminClient).mockReturnValue(
      makeUpsertMock({ error: null, count: 0 }) as any,
    )

    const result = await saveAttendance('class-1', '2025-05-06', sampleEntries)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('권한이 없습니다.')
    }
  })

  it('TA 역할도 출결 저장 가능', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'ta-1', user_metadata: { role: 'ta' } } },
          error: null,
        }),
      },
    } as any)
    vi.mocked(createAdminClient).mockReturnValue(
      makeUpsertMock({ error: null, count: sampleEntries.length }) as any,
    )

    const result = await saveAttendance('class-1', '2025-05-06', sampleEntries)

    expect(result.success).toBe(true)
  })

  it('미인증 상태 → 인증이 필요합니다 반환', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as any)
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
