'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotificationsContext } from '@/contexts/notifications-context'
import type { ToastItem } from '@/hooks/useNotifications'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  qna_new: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  ),
  qna_answered: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  ),
  notice_new: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
    </svg>
  ),
  message_new: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
    </svg>
  ),
  attendance_checked: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" />
    </svg>
  ),
}

function Toast({ toast }: { toast: ToastItem }) {
  const router = useRouter()
  const { dismissToast, markAsRead } = useNotificationsContext()

  useEffect(() => {
    const t = setTimeout(() => dismissToast(toast.id), 5000)
    return () => clearTimeout(t)
  }, [toast.id, dismissToast])

  function handleClick() {
    markAsRead(toast.notificationId)
    dismissToast(toast.id)
    if (toast.link) router.push(toast.link)
  }

  return (
    <div
      onClick={handleClick}
      role="alert"
      className="flex items-start gap-3 w-80 bg-white border border-zinc-200 rounded-2xl px-4 py-3.5 shadow-lg cursor-pointer hover:bg-zinc-50 transition-colors"
      style={{ animation: 'toast-slide-in 0.28s ease forwards' }}
    >
      <span className="mt-0.5 text-zinc-800">
        {TYPE_ICONS[toast.type] ?? TYPE_ICONS.notice_new}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-900 leading-snug">{toast.title}</p>
        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">{toast.body}</p>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); dismissToast(toast.id) }}
        className="mt-0.5 text-zinc-300 hover:text-zinc-600 transition-colors shrink-0"
        aria-label="닫기"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts } = useNotificationsContext()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-label="알림"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} />
        </div>
      ))}
    </div>
  )
}
