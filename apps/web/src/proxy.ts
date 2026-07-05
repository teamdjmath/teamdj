import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

// ── Rate Limiting (Upstash Redis REST API) ──────────────────────
// 학원 환경: 학생·선생님이 NAT 뒤 공유 IP를 사용하므로 한도를 넉넉하게 설정
// 대상은 외부 노출 API와 admin만 — dashboard 페이지 로드는 제외
const RATE_LIMIT_MAX = 300
const SLACK_WARN_AT  = 200
const KEY_PREFIX     = 'teamdj:rl:'
const WINDOW_SEC     = 60

// Rate limit 적용 경로 접두어
// - /admin/ 제외: 인증된 사용자만 접근 가능하므로 IP 제한 불필요
// - /dashboard/ 제외: 학원 NAT 환경에서 공유 IP로 인한 오탐 방지
const RATE_LIMITED_PREFIXES = ['/api/']

// 로컬/내부 IP는 rate limit 제외 (로컬 개발, Vercel health check)
function isPrivateIp(ip: string): boolean {
  return (
    ip === 'unknown' ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('::ffff:127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  )
}

async function redisPipeline(commands: unknown[][]): Promise<unknown[]> {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return []
  try {
    const res  = await fetch(`${url}/pipeline`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(commands),
    })
    const json = await res.json() as { result: unknown }[]
    return json.map((r) => r.result)
  } catch { return [] }
}

async function redisIncr(key: string): Promise<number> {
  const results = await redisPipeline([['INCR', key], ['EXPIRE', key, WINDOW_SEC]])
  return (results[0] as number) ?? 0
}

// Slack 알림 중복 방지: IP별로 경고/차단 각각 분당 1회만 발송
// SET NX EX 로 60초 TTL 플래그를 세워서 이미 보냈으면 건너뜀
async function slackNotifyOnce(key: string, text: string): Promise<void> {
  const slackUrl = process.env.SLACK_WEBHOOK_URL
  if (!slackUrl) return

  // Redis SET NX (Not eXists) — 이미 키가 있으면 0 반환 (이미 알림 보냄)
  const results = await redisPipeline([['SET', key, '1', 'NX', 'EX', WINDOW_SEC]])
  if (results[0] !== 'OK') return  // 이미 이번 분에 발송함

  try {
    await fetch(slackUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    })
  } catch {}
}
// ────────────────────────────────────────────────────────────────

// 로그인 없이 접근 가능한 공개 경로
const PUBLIC_PATHS = ['/', '/intro', '/login', '/register', '/consultation', '/privacy', '/terms']

// staff 전용 경로
const ADMIN_PATH_PREFIX = '/admin'

// 비밀번호 변경 경로 (인증 필요, 변경 완료 전까지 다른 경로 차단)
const CHANGE_PASSWORD_PATH = '/change-password'

// 약관 동의 경로 (인증 필요, 미동의 시 다른 경로 차단)
const CONSENT_PATH = '/consent'

// 스태프 역할 정의
const STAFF_ROLES = ['teacher', 'ta_desk', 'ta_assistant']

// ta_assistant 허용 경로 (/admin 하위) — /admin/qna/stats 는 senior 전용이므로 제외
const TA_ASSISTANT_ALLOWED = [
  '/admin/dashboard',
  '/admin/qna',
  '/admin/messages',
  '/admin/schedule',
  '/admin/staff',
]

// ta_assistant 접근 차단 경로 (허용 경로 하위라도 차단)
const TA_ASSISTANT_BLOCKED = ['/admin/qna/stats']

function isTaAssistantAllowed(pathname: string): boolean {
  if (TA_ASSISTANT_BLOCKED.some((b) => pathname === b || pathname.startsWith(b + '/'))) return false
  return TA_ASSISTANT_ALLOWED.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Rate Limiting (API / admin / dashboard 경로만)
  if (RATE_LIMITED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    const count = isPrivateIp(ip) ? 0 : await redisIncr(`${KEY_PREFIX}${ip}`)

    if (count === SLACK_WARN_AT) {
      void slackNotifyOnce(
        `${KEY_PREFIX}slack:warn:${ip}`,
        `⚠️ *TeamDJ 요청 급증 감지*\nIP: \`${ip}\`\n경로: \`${pathname}\`\n분당 ${count}회 → ${RATE_LIMIT_MAX}회 초과 시 차단`,
      )
    }
    if (count > RATE_LIMIT_MAX) {
      void slackNotifyOnce(
        `${KEY_PREFIX}slack:block:${ip}`,
        `🚨 *TeamDJ Rate Limit 차단*\nIP: \`${ip}\`\n경로: \`${pathname}\`\n분당 ${count}회 요청 — 429 응답 반환`,
      )
      return NextResponse.json(
        { error: 'Too Many Requests — 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': String(WINDOW_SEC) } },
      )
    }
  }

  // 2. Supabase 세션 갱신
  const { supabaseResponse, user } = await updateSession(request)

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // 3. 비로그인 유저가 보호된 경로 접근 시 → /login
  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 4. 로그인된 유저가 /login 또는 /register 접근 시 → 역할별 대시보드
  if (user && isPublic && (pathname === '/login' || pathname === '/register')) {
    const role = user.user_metadata?.role as string | undefined
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = STAFF_ROLES.includes(role ?? '')
      ? '/admin/dashboard'
      : '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // 5. 비밀번호 변경 강제: must_change_password 플래그가 true면 /change-password로 리다이렉트
  if (user && user.user_metadata?.must_change_password === true) {
    if (pathname !== CHANGE_PASSWORD_PATH) {
      const cpUrl = request.nextUrl.clone()
      cpUrl.pathname = CHANGE_PASSWORD_PATH
      return NextResponse.redirect(cpUrl)
    }
    return supabaseResponse
  }

  // 6. 약관 동의 체크: user_metadata에서 확인 (DB 쿼리 없음)
  if (user && !user.user_metadata?.agreed_terms_at) {
    if (pathname !== CONSENT_PATH) {
      const consentUrl = request.nextUrl.clone()
      consentUrl.pathname = CONSENT_PATH
      return NextResponse.redirect(consentUrl)
    }
    return supabaseResponse
  }

  // 7. /admin/* 경로는 스태프만 접근 가능
  if (user && pathname.startsWith(ADMIN_PATH_PREFIX)) {
    const role = user.user_metadata?.role as string | undefined

    if (!STAFF_ROLES.includes(role ?? '')) {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/dashboard'
      return NextResponse.redirect(dashboardUrl)
    }

    // ta_assistant는 허용된 경로만 접근 가능
    if (role === 'ta_assistant' && !isTaAssistantAllowed(pathname)) {
      const qnaUrl = request.nextUrl.clone()
      qnaUrl.pathname = '/admin/qna'
      return NextResponse.redirect(qnaUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // 정적 파일 / Next.js 내부 경로 제외
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
