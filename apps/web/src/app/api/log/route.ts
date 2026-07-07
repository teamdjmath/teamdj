import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { logger } from '@/lib/logger'
import { reportError } from '@/lib/error-report'

type ClientLogBody = {
  level: 'warn' | 'error'
  message: string
  source?: 'client' | 'boundary'
  digest?: string
  context?: Record<string, unknown>
  url?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ClientLogBody

    const { level, message, source, digest, context, url } = body
    if (!level || !message) return NextResponse.json({ ok: false }, { status: 400 })

    // 세션에서 사용자 정보 확보 (비로그인 오류도 수집은 함, 조회 실패해도 로그 자체는 남겨야 함)
    let userId: string | undefined
    let userRole: string | undefined
    try {
      const user = await getVerifiedUser()
      userId   = user?.id
      userRole = user?.user_metadata?.role
    } catch {}

    const ctx = { action: 'client', ...context, url }
    if (level === 'error') logger.error(`[client] ${message}`, ctx)
    else                   logger.warn(`[client] ${message}`, ctx)

    await reportError({
      source:    source ?? 'client',
      severity:  level,
      message:   message.slice(0, 1000),
      digest,
      url,
      userId,
      userRole,
      userAgent: req.headers.get('user-agent') ?? '',
      context,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
