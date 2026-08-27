import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// 웹 푸시 발송 — 카카오(SOLAPI)와 달리 사업자 등록·외부 서비스 연동이 전혀 필요 없다. 브라우저가
// 기본 제공하는 기능이라 VAPID 키 쌍만 있으면 바로 동작한다 (README/스크래치 스크립트로 생성).
function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) return null
  return { publicKey, privateKey, subject }
}

type PushPayload = {
  title: string
  body: string
  url?: string
}

// notifications.createNotification이 알림을 하나 만들 때마다 같이 호출한다 — 그 유저의 모든
// 구독(디바이스)에 보내고, 브라우저가 "이 구독은 더 이상 유효하지 않다"(410/404)고 답하면
// 그 구독은 조용히 지운다. 실패해도 원래 알림 생성 자체를 막으면 안 되므로 예외를 던지지 않는다.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const config = getVapidConfig()
  if (!config) return

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subscriptions } = await (admin as any)
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('user_id', userId)

  if (!subscriptions || subscriptions.length === 0) return

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey)

  const body = JSON.stringify(payload)

  await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth_key as string } },
          body,
        )
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          // 브라우저에서 알림 권한을 껐거나 구독이 만료됨 — 더 이상 유효하지 않은 구독이므로 정리
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (admin as any).from('push_subscriptions').delete().eq('id', sub.id as string)
        } else {
          logger.warn('sendPushToUser:send-failed', { action: 'sendPushToUser', userId, error: err })
        }
      }
    }),
  )
}
