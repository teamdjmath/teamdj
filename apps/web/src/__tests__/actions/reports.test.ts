import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { purgeOldReports } from '@/lib/actions/reports'

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
