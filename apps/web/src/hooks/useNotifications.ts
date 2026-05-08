'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRow,
} from '@/lib/actions/notifications'

export type ToastItem = {
  id: string
  notificationId: string
  title: string
  body: string
  link: string | null
  type: string
}

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    getNotifications().then(setNotifications)
  }, [])

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as NotificationRow
          setNotifications((prev) => [n, ...prev].slice(0, 20))
          setToasts((prev) => [
            ...prev.slice(-2),
            {
              id: crypto.randomUUID(),
              notificationId: n.id,
              title: n.title,
              body: n.body,
              link: n.link,
              type: n.type,
            },
          ])
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    await markNotificationRead(id)
  }, [])

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await markAllNotificationsRead()
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return { notifications, unreadCount, markAsRead, markAllAsRead, toasts, dismissToast }
}
