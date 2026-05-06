import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseSupabaseError, logger } from '@/lib/logger'
import { withAction } from '@/lib/actions'

describe('parseSupabaseError', () => {
  it('23505 코드 → 중복된 데이터입니다', () => {
    const result = parseSupabaseError({ code: '23505', message: 'duplicate key value violates unique constraint' })
    expect(result.message).toBe('중복된 데이터입니다')
    expect(result.code).toBe('23505')
  })

  it('23503 코드 → 참조하는 데이터가 존재하지 않습니다', () => {
    const result = parseSupabaseError({ code: '23503', message: 'foreign key violation' })
    expect(result.message).toBe('참조하는 데이터가 존재하지 않습니다')
  })

  it('42501 코드 → 접근 권한이 없습니다 (RLS)', () => {
    const result = parseSupabaseError({ code: '42501', message: 'insufficient privilege' })
    expect(result.message).toBe('접근 권한이 없습니다 (RLS)')
  })

  it('PGRST116 코드 → 데이터를 찾을 수 없습니다', () => {
    const result = parseSupabaseError({ code: 'PGRST116', message: 'row not found' })
    expect(result.message).toBe('데이터를 찾을 수 없습니다')
  })

  it('알 수 없는 코드 → 원본 메시지 반환', () => {
    const result = parseSupabaseError({ code: 'CUSTOM_ERR', message: '커스텀 에러 메시지' })
    expect(result.message).toBe('커스텀 에러 메시지')
    expect(result.code).toBe('CUSTOM_ERR')
  })

  it('Error 인스턴스 → UNKNOWN 코드 + 메시지', () => {
    const result = parseSupabaseError(new Error('DB 연결 실패'))
    expect(result.code).toBe('UNKNOWN')
    expect(result.message).toBe('DB 연결 실패')
  })

  it('null → 알 수 없는 오류', () => {
    const result = parseSupabaseError(null)
    expect(result.code).toBe('UNKNOWN')
    expect(result.message).toBe('알 수 없는 오류')
  })

  it('hint/details 필드 보존', () => {
    const result = parseSupabaseError({ code: '23505', message: 'dup', hint: '힌트', details: '세부사항' })
    expect(result.hint).toBe('힌트')
    expect(result.details).toBe('세부사항')
  })
})

describe('민감한 필드 REDACTED 처리', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('password 필드 → [REDACTED]로 치환, 원본 값 노출 안 됨', () => {
    logger.info('test', { input: { password: 'super_secret', name: '홍길동' } })
    const output = consoleSpy.mock.calls[0]?.[0] as string
    expect(output).toContain('[REDACTED]')
    expect(output).not.toContain('super_secret')
  })

  it('token, key, secret 필드 모두 REDACTED', () => {
    logger.info('test', { input: { token: 'tok123', key: 'key456', secret: 'sec789' } })
    const output = consoleSpy.mock.calls[0]?.[0] as string
    expect(output).not.toContain('tok123')
    expect(output).not.toContain('key456')
    expect(output).not.toContain('sec789')
  })

  it('민감하지 않은 필드는 그대로 출력', () => {
    logger.info('test', { input: { name: '홍길동', phone: '01012345678' } })
    const output = consoleSpy.mock.calls[0]?.[0] as string
    expect(output).toContain('홍길동')
  })
})

describe('withAction', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('성공 시 { success: true, data } 형태 반환', async () => {
    const result = await withAction('testAction', 'user-1', async () => ({
      success: true as const,
      data: { count: 5 },
    }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data?.count).toBe(5)
    }
  })

  it('fn에서 { success: false } 반환 시 error 메시지 포함', async () => {
    const result = await withAction('testAction', 'user-1', async () => ({
      success: false as const,
      error: '검증 실패 메시지',
    }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('검증 실패 메시지')
    }
  })

  it('fn에서 Supabase 에러 throw → parseSupabaseError로 한국어 변환', async () => {
    const result = await withAction('testAction', 'user-1', async () => {
      throw { code: '23505', message: 'duplicate key value' }
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('중복된 데이터입니다')
    }
  })

  it('fn에서 일반 Error throw → 메시지 그대로 반환', async () => {
    const result = await withAction('testAction', 'user-1', async () => {
      throw new Error('네트워크 오류')
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('네트워크 오류')
    }
  })

  it('data 없는 성공 케이스 → { success: true }', async () => {
    const result = await withAction('testAction', 'user-1', async () => ({
      success: true as const,
    }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBeUndefined()
    }
  })
})
