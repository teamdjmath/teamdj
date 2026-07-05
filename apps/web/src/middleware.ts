import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 분당 허용 요청 수 (IP 기준)
const RATE_LIMIT_MAX   = 60
// 이 수치에 도달하면 차단 전 Slack 경고 선발송
const SLACK_WARN_AT    = 50
// Upstash Redis key prefix
const KEY_PREFIX       = 'teamdj:rl:'
// 카운터 만료 시간 (초)
const WINDOW_SEC       = 60

// ─────────────────────────────────────────────────────────────
// Upstash REST API — 패키지 설치 없이 fetch로 직접 호출
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 미설정 시
// rate limiting 없이 통과 (Slack 알림은 별도 동작)
// ─────────────────────────────────────────────────────────────
async function redisIncr(key: string): Promise<number> {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return 0

  try {
    // pipeline: INCR + EXPIRE 한 번에
    const res = await fetch(`${url}/pipeline`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, WINDOW_SEC],
      ]),
    })
    const json = await res.json() as [{ result: number }, unknown]
    return json[0]?.result ?? 0
  } catch {
    return 0
  }
}

async function slackNotify(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL
  if (!url) return
  try {
    await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    })
  } catch {
    // Slack 알림 실패는 무시 — 본 서비스 차단하지 않음
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // IP 추출 (Vercel 환경: x-forwarded-for 헤더)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  const key   = `${KEY_PREFIX}${ip}`
  const count = await redisIncr(key)

  // 경고 임계값 도달 시 Slack 선알림 (차단 전 사전 경고)
  if (count === SLACK_WARN_AT) {
    void slackNotify(
      `⚠️ *TeamDJ 요청 급증 감지*\nIP: \`${ip}\`\n경로: \`${pathname}\`\n분당 ${count}회 → ${RATE_LIMIT_MAX}회 초과 시 차단`
    )
  }

  // Rate limit 초과 → 차단 + Slack 알림
  if (count > RATE_LIMIT_MAX) {
    await slackNotify(
      `🚨 *TeamDJ Rate Limit 차단*\nIP: \`${ip}\`\n경로: \`${pathname}\`\n분당 ${count}회 요청 — 429 응답 반환`
    )
    return NextResponse.json(
      { error: 'Too Many Requests — 잠시 후 다시 시도해주세요.' },
      {
        status:  429,
        headers: { 'Retry-After': String(WINDOW_SEC) },
      }
    )
  }

  return NextResponse.next()
}

// /api/* + /admin/* + /dashboard/* 에만 적용
// 정적 파일(_next, favicon 등)은 자동 제외됨
export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/dashboard/:path*',
  ],
}
