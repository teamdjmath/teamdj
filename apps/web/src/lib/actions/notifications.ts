'use server'

import { createClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'
import { logger } from '@/lib/logger'

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

  // 이 앱의 모든 알림(질문/답변/공지/쪽지/출석)이 여기 한 곳을 거치므로, 여기서만 웹 푸시를
  // 같이 보내면 호출부를 하나하나 안 고쳐도 전부 웹 푸시가 함께 나간다. 구독이 없거나 VAPID
  // 설정이 없으면 sendPushToUser가 조용히 아무 것도 안 하므로 실패해도 알림 생성 자체는 유지.
  try {
    await sendPushToUser(userId, { title, body, url: link })
  } catch (err) {
    logger.warn('createNotification:push-failed', { action: 'createNotification', userId, error: err })
  }
}

export async function getNotifications(): Promise<NotificationRow[]> {
  const supabase = await createClient()
  const user = await getVerifiedUser()
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
  const user = await getVerifiedUser()
  if (!user) return
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', user.id)
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  const user = await getVerifiedUser()
  if (!user) return
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
}
