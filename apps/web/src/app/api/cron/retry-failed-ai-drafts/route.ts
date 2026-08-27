import { NextResponse, type NextRequest } from 'next/server'
import { runRetryFailedAiDrafts } from '@/lib/cron/retry-failed-ai-drafts'

export const dynamic = 'force-dynamic'

// vercel.json의 crons 설정이 매시 정각 이 경로를 호출한다. CRON_SECRET 검증은
// api/cron/qna-answer-reminder/route.ts와 동일한 방식.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const result = await runRetryFailedAiDrafts()
  return NextResponse.json(result)
}
