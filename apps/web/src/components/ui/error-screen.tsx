'use client'

import { useEffect } from 'react'
import Link from 'next/link'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
  /** 로그 식별용 바운더리 이름 (예: 'dashboard', 'admin') */
  scope: string
  /** 홈 버튼 목적지 */
  homeHref?: string
}

// 에러 바운더리 공용 화면 — 오류를 /api/log로 보고하고 사용자에겐 정돈된 안내만 보여준다.
// 프로덕션에선 서버 에러 메시지가 digest로 가려지므로 원문 대신 오류 코드를 안내한다.
export function ErrorScreen({ error, reset, scope, homeHref = '/' }: Props) {
  useEffect(() => {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'error',
        source: 'boundary',
        message: `[${scope}] ${error.message || 'error boundary triggered'}`,
        digest: error.digest,
        context: { scope, stack: error.stack?.slice(0, 500) },
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      }),
    }).catch(() => {})
  }, [error, scope])

  const code = error.digest?.slice(0, 8)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 max-w-sm w-full shadow-sm">
        <div className="mb-5 flex justify-center">
          <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
        </div>
        <h2 className="text-base font-bold text-zinc-900">일시적인 오류가 발생했습니다</h2>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
          오류가 자동으로 접수되었습니다.
          <br />잠시 후 다시 시도해주세요.
        </p>
        {code && (
          <p className="mt-3 text-xs text-zinc-400">
            문제가 계속되면 오류 코드 <span className="font-mono font-semibold text-zinc-600">{code}</span>를 알려주세요.
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={reset}
            className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-colors"
          >
            다시 시도
          </button>
          <Link
            href={homeHref}
            className="w-full rounded-xl py-3 text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    </div>
  )
}
