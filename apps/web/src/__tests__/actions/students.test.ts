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
import { createStudent, updateStudent } from '@/lib/actions/students'

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

    vi.mocked(getVerifiedUser).mockResolvedValue(mockCaller as any)
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
    vi.mocked(getVerifiedUser).mockResolvedValue(null)
    const admin = makeAdminMock()
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const result = await createStudent(formData)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('인증이 필요합니다.')
    }
  })
})

// 이름을 고쳐도 user_metadata.name이 동기화 안 돼서 학생이 로그인 화면에서 옛 이름을
// 계속 보던 버그(전화번호 변경 시에만 auth를 갱신했고, 그마저도 phone만 넣고 name은 빠뜨림)의
// 회귀 테스트.
describe('updateStudent', () => {
  function makeUpdateAdminMock({
    current = { phone: '01011112222', name: '이임수' },
    dup = null as { id: string } | null,
  } = {}) {
    const updateUserByIdMock = vi.fn().mockResolvedValue({ error: null })
    const getUserByIdMock = vi.fn().mockResolvedValue({
      data: { user: { user_metadata: { role: 'student', phone: current.phone, name: current.name, must_change_password: false } } },
    })
    const usersUpdateEqMock = vi.fn().mockResolvedValue({ error: null })

    const usersFrom = {
      select: vi.fn((cols: string) => {
        if (cols.includes('phone, name')) {
          return { eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: current }) }) }
        }
        return { eq: vi.fn().mockReturnValue({ neq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: dup }) }) }) }
      }),
      update: vi.fn().mockReturnValue({ eq: usersUpdateEqMock }),
    }

    return {
      auth: { admin: { getUserById: getUserByIdMock, updateUserById: updateUserByIdMock } },
      from: vi.fn().mockReturnValue(usersFrom),
      updateUserByIdMock,
      getUserByIdMock,
      usersUpdateEqMock,
      usersFrom,
    }
  }

  function makeFormData(overrides: Record<string, string> = {}) {
    const fd = new FormData()
    fd.set('studentId', 'student-1')
    fd.set('name', overrides.name ?? '이임수')
    fd.set('phone', overrides.phone ?? '01011112222')
    fd.set('school', '대륜고')
    fd.set('grade', '1')
    return fd
  }

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getVerifiedUser).mockResolvedValue(mockCaller as any)
  })
  afterEach(() => vi.restoreAllMocks())

  it('이름만 바뀌어도 user_metadata.name이 새 이름으로 동기화된다 (전화번호는 안 건드림)', async () => {
    const admin = makeUpdateAdminMock({ current: { phone: '01011112222', name: '이임수' } })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const result = await updateStudent(makeFormData({ name: '이인수', phone: '01011112222' }))

    expect(result.success).toBe(true)
    expect(admin.updateUserByIdMock).toHaveBeenCalledTimes(1)
    const [, payload] = admin.updateUserByIdMock.mock.calls[0]
    expect(payload.user_metadata.name).toBe('이인수')
    expect(payload.email).toBeUndefined() // 전화번호 안 바뀌었으면 로그인 이메일은 안 건드림
  })

  it('전화번호가 바뀌면 로그인 이메일과 user_metadata의 name·phone이 함께 갱신된다', async () => {
    const admin = makeUpdateAdminMock({ current: { phone: '01011112222', name: '이인수' } })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const result = await updateStudent(makeFormData({ name: '이인수', phone: '01099998888' }))

    expect(result.success).toBe(true)
    const [, payload] = admin.updateUserByIdMock.mock.calls[0]
    expect(payload.email).toBe('01099998888@teamdj.com')
    expect(payload.user_metadata.name).toBe('이인수')
    expect(payload.user_metadata.phone).toBe('01099998888')
  })

  it('이름·전화번호 둘 다 안 바뀌면 auth 갱신을 아예 호출하지 않는다', async () => {
    const admin = makeUpdateAdminMock({ current: { phone: '01011112222', name: '이인수' } })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const result = await updateStudent(makeFormData({ name: '이인수', phone: '01011112222' }))

    expect(result.success).toBe(true)
    expect(admin.updateUserByIdMock).not.toHaveBeenCalled()
    expect(admin.getUserByIdMock).not.toHaveBeenCalled()
  })

  it('이미 등록된 전화번호로 바꾸려 하면 실패하고 auth는 건드리지 않는다', async () => {
    const admin = makeUpdateAdminMock({
      current: { phone: '01011112222', name: '이인수' },
      dup: { id: 'other-student' },
    })
    vi.mocked(createAdminClient).mockReturnValue(admin as any)

    const result = await updateStudent(makeFormData({ name: '이인수', phone: '01099998888' }))

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('이미 등록된 전화번호입니다.')
    expect(admin.updateUserByIdMock).not.toHaveBeenCalled()
  })
})
