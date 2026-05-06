import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

type ClientLogBody = {
  level: 'warn' | 'error'
  message: string
  context?: Record<string, unknown>
  url?: string
  userAgent?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ClientLogBody

    const { level, message, context, url } = body
    if (!level || !message) return NextResponse.json({ ok: false }, { status: 400 })

    const ctx = { action: 'client', ...context, url }

    if (level === 'error') {
      logger.error(`[client] ${message}`, ctx)
    } else {
      logger.warn(`[client] ${message}`, ctx)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
