'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { signOut } from '@/lib/actions/auth'

const INACTIVE_MS  = 30 * 60 * 1000  // 30분
const WARN_BEFORE  =  2 * 60 * 1000  // 만료 2분 전 경고

const EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const

export function InactivityGuard() {
  const [warning, setWarning] = useState(false)
  const [seconds, setSeconds] = useState(WARN_BEFORE / 1000)

  const logoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const warnRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const tickRef   = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const reset = useCallback(() => {
    clearTimeout(logoutRef.current)
    clearTimeout(warnRef.current)
    clearInterval(tickRef.current)
    setWarning(false)

    warnRef.current = setTimeout(() => {
      setWarning(true)
      setSeconds(WARN_BEFORE / 1000)
      tickRef.current = setInterval(() => {
        setSeconds((s) => Math.max(0, s - 1))
      }, 1000)
    }, INACTIVE_MS - WARN_BEFORE)

    logoutRef.current = setTimeout(() => void signOut(), INACTIVE_MS)
  }, [])

  useEffect(() => {
    reset()
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => {
      clearTimeout(logoutRef.current)
      clearTimeout(warnRef.current)
      clearInterval(tickRef.current)
      EVENTS.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [reset])

  if (!warning) return null

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="w-full max-w-sm mx-4 rounded-3xl bg-white p-8 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline strokeLinecap="round" strokeLinejoin="round" points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-zinc-900">세션이 곧 만료됩니다</h2>
        <p className="mt-2 text-sm text-zinc-500">
          {mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`} 후 자동으로 로그아웃됩니다.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={reset}
            className="w-full rounded-2xl bg-zinc-950 py-3.5 text-sm font-bold text-white hover:bg-zinc-800 transition-colors"
          >
            계속 사용하기
          </button>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-2xl py-3.5 text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              지금 로그아웃
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
