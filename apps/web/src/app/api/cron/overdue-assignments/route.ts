import { NextResponse, type NextRequest } from 'next/server'
import { runOverdueAssignmentsDigest } from '@/lib/cron/overdue-assignments'

export const dynamic = 'force-dynamic'

// vercel.json의 crons 설정이 매일 이 경로를 호출한다. Vercel은 CRON_SECRET env가 설정돼 있으면
// 자동으로 Authorization: Bearer <CRON_SECRET> 헤더를 붙여 보내므로, 그 값만 검증하면
// 외부에서 URL을 알아도 임의로 발송을 트리거할 수 없다.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const result = await runOverdueAssignmentsDigest()
  return NextResponse.json(result)
}
