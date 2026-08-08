import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/verified-user', () => ({ getVerifiedUser: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { purgeOldReports, sendKakaoReport, sendBatchKakaoReports } from '@/lib/actions/reports'

function makeAdminMock(rows: Array<{ image_url: string | null }>) {
  const removeMock = vi.fn().mockResolvedValue({ error: null })
  const deleteLtMock = vi.fn().mockResolvedValue({ error: null })
  const selectLtMock = vi.fn().mockResolvedValue({ data: rows })

  return {
    admin: {
      storage: { from: vi.fn().mockReturnValue({ remove: removeMock }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ lt: selectLtMock }),
        delete: vi.fn().mockReturnValue({ lt: deleteLtMock }),
      }),
    },
    removeMock,
    deleteLtMock,
  }
}

describe('purgeOldReports', () => {
  it('오래된 리포트의 Storage 이미지를 지우고 DB 행도 삭제한다', async () => {
    const { admin, removeMock, deleteLtMock } = makeAdminMock([
      { image_url: 'https://x.supabase.co/storage/v1/object/public/reports/student-1/2026-01-01_1.png' },
      { image_url: null },
    ])
    vi.mocked(createAdminClient).mockReturnValue(admin as unknown as ReturnType<typeof createAdminClient>)

    await purgeOldReports(90)

    expect(removeMock).toHaveBeenCalledWith(['student-1/2026-01-01_1.png'])
    expect(deleteLtMock).toHaveBeenCalledWith('report_date', expect.any(String))
  })

  it('삭제 대상이 없으면 Storage/DB 어느 쪽도 건드리지 않는다', async () => {
    const { admin, removeMock, deleteLtMock } = makeAdminMock([])
    vi.mocked(createAdminClient).mockReturnValue(admin as unknown as ReturnType<typeof createAdminClient>)

    await purgeOldReports(90)

    expect(removeMock).not.toHaveBeenCalled()
    expect(deleteLtMock).not.toHaveBeenCalled()
  })
})

// Solapi 연동 전(사업자번호/채널 준비 전) 지금 상태 — 환경변수가 없으면 실제 발송을
// 시도하지 않고 안전하게 에러만 반환해야 한다. 나중에 SOLAPI_* 값만 채우면 이 가드를
// 그대로 통과해서 실제 발송 경로로 들어간다.
describe('sendKakaoReport / sendBatchKakaoReports — Solapi 미설정 시 안전 가드', () => {
  beforeEach(() => {
    vi.stubEnv('SOLAPI_API_KEY', '')
    vi.stubEnv('SOLAPI_API_SECRET', '')
    vi.stubEnv('SOLAPI_PF_ID', '')
    vi.stubEnv('SOLAPI_SENDER_PHONE', '')
    vi.mocked(createAdminClient).mockClear()
  })

  it('sendKakaoReport: 환경변수 없으면 DB/네트워크 호출 없이 에러를 반환한다', async () => {
    const result = await sendKakaoReport('report-1')
    expect(result.error).toBeTruthy()
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('sendBatchKakaoReports: 환경변수 없으면 DB/네트워크 호출 없이 에러를 반환한다', async () => {
    const result = await sendBatchKakaoReports('class-1', '2026-01-01')
    expect(result.error).toBeTruthy()
    expect(result.sent).toBe(0)
    expect(createAdminClient).not.toHaveBeenCalled()
  })
})
