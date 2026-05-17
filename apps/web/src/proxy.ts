import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

// 로그인 없이 접근 가능한 공개 경로
const PUBLIC_PATHS = ['/', '/intro', '/login', '/register', '/consultation']

// staff 전용 경로
const ADMIN_PATH_PREFIX = '/admin'

// 비밀번호 변경 경로 (인증 필요, 변경 완료 전까지 다른 경로 차단)
const CHANGE_PASSWORD_PATH = '/change-password'

// 스태프 역할 정의
const STAFF_ROLES = ['teacher', 'ta_admin', 'ta_assistant']

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

  // 1. Supabase 세션 갱신
  const { supabaseResponse, user } = await updateSession(request)

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // 2. 비로그인 유저가 보호된 경로 접근 시 → /login
  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 3. 로그인된 유저가 /login 또는 /register 접근 시 → 역할별 대시보드
  if (user && isPublic && (pathname === '/login' || pathname === '/register')) {
    const role = user.user_metadata?.role as string | undefined
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = STAFF_ROLES.includes(role ?? '')
      ? '/admin/dashboard'
      : '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // 4. 비밀번호 변경 강제: must_change_password 플래그가 true면 /change-password로 리다이렉트
  if (user && user.user_metadata?.must_change_password === true) {
    if (pathname !== CHANGE_PASSWORD_PATH) {
      const cpUrl = request.nextUrl.clone()
      cpUrl.pathname = CHANGE_PASSWORD_PATH
      return NextResponse.redirect(cpUrl)
    }
    return supabaseResponse
  }

  // 5. /admin/* 경로는 스태프만 접근 가능
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
