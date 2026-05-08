'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

type ContextValue = ReturnType<typeof useNotifications>

const NotificationsContext = createContext<ContextValue | null>(null)

export function NotificationsProvider({
  userId,
  children,
}: {
  userId: string
  children: ReactNode
}) {
  const value = useNotifications(userId)
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotificationsContext() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotificationsContext must be used within NotificationsProvider')
  return ctx
}
