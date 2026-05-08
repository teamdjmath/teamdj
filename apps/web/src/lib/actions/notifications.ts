'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type NotificationType =
  | 'qna_new'
  | 'qna_answered'
  | 'notice_new'
  | 'message_new'
  | 'attendance_checked'

export type NotificationRow = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  link: string | null
  is_read: boolean
  created_at: string
}

// Server-to-server helper: creates a notification for any user (bypasses RLS via admin client)
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
): Promise<void> {
  const admin = createAdminClient()
  await admin.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    link: link ?? null,
  })
}

export async function getNotifications(): Promise<NotificationRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, link, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (data ?? []) as NotificationRow[]
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', user.id)
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
}
