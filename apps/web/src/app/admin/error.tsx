'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'error',
        message: error.message || 'AdminError boundary triggered',
        context: { digest: error.digest, stack: error.stack?.slice(0, 500) },
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      }),
    }).catch(() => {})
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-2xl border border-zinc-200 bg-white p-10 max-w-sm w-full">
        <div className="mb-4 flex justify-center">
          <svg className="w-10 h-10 text-zinc-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-zinc-900 mb-1">오류가 발생했습니다</h2>
        <p className="text-sm text-zinc-400 mb-6">
          {error.message || '알 수 없는 오류가 발생했습니다.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="w-full rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  )
}
