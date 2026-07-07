import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
vi.mock('@/lib/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/logger')>()
  return {
    ...actual,
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  }
})

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClass } from '@/lib/actions/classes'

const mockTeacher = { id: 'teacher-1', user_metadata: { role: 'teacher' } }

function makeAdminMock(insertResult: { data?: { id: string } | null; error: unknown }) {
  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(insertResult),
        }),
      }),
    }),
  }
}

function makeAuthMock(user: typeof mockTeacher | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  }
}

describe('createClass', () => {
  let formData: FormData

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    formData = new FormData()
    formData.set('name', '수학 A반')
    formData.set('subject', '수학')
    formData.set('grade', '중1')

    vi.mocked(createClient).mockResolvedValue(makeAuthMock(mockTeacher) as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('성공 케이스 → { success: true }', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminMock({ data: { id: 'class-1' }, error: null }) as any,
    )

    const result = await createClass(formData)

    expect(result.success).toBe(true)
  })

  it('이름 중복 (23505) → 중복된 데이터입니다 반환', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminMock({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      }) as any,
    )

    const result = await createClass(formData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('중복된 데이터입니다')
    }
  })

  it('RLS 권한 없음 (42501) → 접근 권한이 없습니다 (RLS) 반환', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminMock({
        data: null,
        error: { code: '42501', message: 'insufficient privilege' },
      }) as any,
    )

    const result = await createClass(formData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('접근 권한이 없습니다 (RLS)')
    }
  })

  it('필수 항목 누락 → 필수 항목을 입력해주세요 반환', async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdminMock({ error: null }) as any)

    const emptyForm = new FormData()
    emptyForm.set('name', '')
    emptyForm.set('subject', '')
    emptyForm.set('grade', '')

    const result = await createClass(emptyForm)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('필수 항목을 입력해주세요.')
    }
  })

  it('미인증 상태 → 인증이 필요합니다 반환', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthMock(null) as any)
    vi.mocked(createAdminClient).mockReturnValue(makeAdminMock({ error: null }) as any)

    const result = await createClass(formData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('인증이 필요합니다.')
    }
  })

  it('ta_desk 역할도 분반 생성 가능', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthMock({ id: 'ta-1', user_metadata: { role: 'ta_desk' } }) as any,
    )
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminMock({ data: { id: 'class-1' }, error: null }) as any,
    )

    const result = await createClass(formData)

    expect(result.success).toBe(true)
  })
})
