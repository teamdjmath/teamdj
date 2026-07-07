import { createClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { MessagesClient } from './_components/messages-client'

export default async function StudentMessagesPage() {
  const supabase = await createClient()
  const user = await getVerifiedUser()
  const userId = user!.id

  // 소속 반 ID 목록
  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('student_id', userId)
    .eq('is_active', true)
  const classIds = (memberships ?? []).map(m => m.class_id)

  // 메시지 목록 조회 (개인 + 반 전체)
  const { data: messages } = await supabase
    .from('push_messages')
    .select(`
      id,
      content,
      created_at,
      is_read,
      sender:users!push_messages_sender_id_fkey(name)
    `)
    .or(`student_id.eq.${userId}${classIds.length > 0 ? `,class_id.in.(${classIds.join(',')})` : ''}`)
    .order('created_at', { ascending: false })

  const formattedMessages = (messages ?? []).map((m: {
    id: string
    content: string
    created_at: string
    is_read: boolean
    sender: { name: string | null } | { name: string | null }[]
  }) => ({
    ...m,
    sender: Array.isArray(m.sender) ? m.sender[0] : m.sender
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <h1 className="text-xl font-bold text-zinc-950">알림 쪽지</h1>
      </div>

      <MessagesClient initialMessages={formattedMessages} />
    </div>
  )
}
