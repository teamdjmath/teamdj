'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotificationsContext } from '@/contexts/notifications-context'
import type { NotificationRow } from '@/lib/actions/notifications'

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)   return '방금'
  if (mins < 60)  return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

export function NotificationBell({ placement = 'down' }: { placement?: 'up' | 'down' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationsContext()

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  async function handleItemClick(n: NotificationRow) {
    if (!n.is_read) markAsRead(n.id)
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
        aria-label="알림"
        aria-expanded={open}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-zinc-950 px-1 text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute w-80 z-50 rounded-2xl border border-zinc-200 bg-white shadow-xl overflow-hidden ${placement === 'up' ? 'bottom-full mb-2 left-0' : 'top-full mt-2 right-0'}`}>
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-900">알림</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => { markAllAsRead(); }}
                className="text-xs text-zinc-400 hover:text-zinc-800 transition-colors"
              >
                모두 읽음
              </button>
            )}
          </div>

          {/* 목록 */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-400">새 알림이 없습니다</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`px-4 py-3 cursor-pointer hover:bg-zinc-50 transition-colors ${
                      !n.is_read ? 'bg-zinc-50/60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {!n.is_read && (
                        <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-zinc-950 shrink-0" />
                      )}
                      <div className={!n.is_read ? '' : 'ml-4'}>
                        <p className={`text-xs font-semibold leading-snug ${n.is_read ? 'text-zinc-500' : 'text-zinc-900'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {n.body}
                        </p>
                        <p className="text-[10px] text-zinc-300 mt-1">{relativeTime(n.created_at)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
