'use client'

import { useEffect } from 'react'
import { markAllAsRead } from '@/lib/actions/messages'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

interface Message {
  id: string
  content: string
  created_at: string
  is_read: boolean
  sender: { name: string | null } | null
}

export function MessagesClient({ initialMessages }: { initialMessages: Message[] }) {
  const messages = initialMessages

  useEffect(() => {
    // 페이지 진입 시 모든 메시지 읽음 처리
    const hasUnread = messages.some(m => !m.is_read)
    if (hasUnread) {
      markAllAsRead()
    }
  }, [messages])

  if (messages.length === 0) {
    return <EmptyState message="받은 쪽지가 없습니다." />
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <Card key={m.id} className={m.is_read ? 'opacity-70' : 'border-zinc-950 ring-1 ring-zinc-950/5'}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight">
                    {m.sender?.name ?? '시스템'}
                  </span>
                  {!m.is_read && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  )}
                </div>
                <p className="text-sm font-medium leading-relaxed text-zinc-800 whitespace-pre-wrap">
                  {m.content}
                </p>
                <p className="text-[10px] text-zinc-400">
                  {new Date(m.created_at).toLocaleString('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
