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
import { createStudent } from '@/lib/actions/students'

const mockCaller = { id: 'teacher-1', user_metadata: { role: 'teacher' } }
const mockNewUser = { id: 'new-student-uuid' }

function makeAdminMock({
  createUserResult = { data: { user: mockNewUser }, error: null },
  upsertResult = { error: null },
  deleteUserResult = { error: null },
}: {
  createUserResult?: { data: { user: typeof mockNewUser } | null; error: unknown }
  upsertResult?: { error: unknown }
  deleteUserResult?: { error: unknown }
} = {}) {
  const deleteUserMock = vi.fn().mockResolvedValue(deleteUserResult)
  const createUserMock = vi.fn().mockResolvedValue(createUserResult)

  return {
    auth: {
      admin: {
        createUser: createUserMock,
        deleteUser: deleteUserMock,
      },
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue(upsertResult),
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    }),
    deleteUserMock,
    createUserMock,
  }
}

describe('createStudent', () => {
  let formData: FormData

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    formData = new FormData()
    formData.set('name', '홍길동')
    formData.set('phone', '01012345678')
    formData.set('password', 'pass1234')

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockCaller }, error: null }),
      },
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('성공 케이스 → { success: true }', async () => {
    const admin = makeAdminMock()
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const result = await createStudent(formData)

    expect(result.success).toBe(true)
  })

  it('phone 누락 → 필수 항목을 입력해주세요 반환', async () => {
    const admin = makeAdminMock()
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const badForm = new FormData()
    badForm.set('name', '홍길동')
    badForm.set('phone', '')
    badForm.set('password', 'pass1234')

    const result = await createStudent(badForm)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('필수 항목을 입력해주세요.')
    }
    // auth.admin.createUser가 호출되지 않아야 함
    expect(admin.createUserMock).not.toHaveBeenCalled()
  })

  it('name 누락 → 필수 항목을 입력해주세요 반환', async () => {
    const admin = makeAdminMock()
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const badForm = new FormData()
    badForm.set('name', '')
    badForm.set('phone', '01012345678')
    badForm.set('password', 'pass1234')

    const result = await createStudent(badForm)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('필수 항목을 입력해주세요.')
    }
  })

  it('users 테이블 upsert 실패 시 auth 롤백(deleteUser) 호출', async () => {
    const admin = makeAdminMock({
      upsertResult: { error: { code: '42501', message: 'RLS violation' } },
    })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const result = await createStudent(formData)

    expect(admin.deleteUserMock).toHaveBeenCalledWith(mockNewUser.id)
    expect(result.success).toBe(false)
  })

  it('이미 등록된 전화번호 → 이미 등록된 전화번호입니다 반환', async () => {
    const admin = makeAdminMock({
      createUserResult: {
        data: null,
        error: { message: 'User already been registered' },
      },
    })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const result = await createStudent(formData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('이미 등록된 전화번호입니다.')
    }
  })

  it('미인증 상태 → 인증이 필요합니다 반환', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as any)
    const admin = makeAdminMock()
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const result = await createStudent(formData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('인증이 필요합니다.')
    }
  })
})
