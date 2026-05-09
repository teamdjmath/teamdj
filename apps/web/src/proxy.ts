import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

// 로그인 없이 접근 가능한 공개 경로
const PUBLIC_PATHS = ['/', '/intro', '/login', '/register']

// teacher / ta 전용 경로
const ADMIN_PATH_PREFIX = '/admin'

// 비밀번호 변경 경로 (인증 필요, 변경 완료 전까지 다른 경로 차단)
const CHANGE_PASSWORD_PATH = '/change-password'

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
    redirectUrl.pathname = role === 'teacher' || role === 'ta'
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

  // 5. /admin/* 경로는 teacher / ta 만 접근 가능
  if (user && pathname.startsWith(ADMIN_PATH_PREFIX)) {
    const role = user.user_metadata?.role as string | undefined
    if (role !== 'teacher' && role !== 'ta') {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/dashboard'
      return NextResponse.redirect(dashboardUrl)
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
