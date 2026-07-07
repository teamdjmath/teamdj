import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { setTrustedUserHeaders } from './trusted-user-headers'

// proxy.ts 에서 호출 — 세션 쿠키를 갱신하고 유저 정보를 반환
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 요청 쿠키 갱신
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          // 응답 쿠키 갱신 (브라우저에 전달)
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getUser()를 반드시 호출해야 세션이 갱신됨
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 검증된 유저 정보를 요청 헤더로 하위(레이아웃/페이지)에 전달 — 매번 auth.getUser()를 다시 호출하지 않도록.
  // 클라이언트가 같은 이름의 헤더를 보내더라도 setTrustedUserHeaders가 항상 먼저 지우고 검증된 값으로만 채우므로 위조 불가.
  const requestHeaders = new Headers(request.headers)
  setTrustedUserHeaders(requestHeaders, user)

  const responseWithUserHeaders = NextResponse.next({ request: { headers: requestHeaders } })
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    responseWithUserHeaders.cookies.set(cookie)
  })
  supabaseResponse = responseWithUserHeaders

  return { supabaseResponse, user }
}
