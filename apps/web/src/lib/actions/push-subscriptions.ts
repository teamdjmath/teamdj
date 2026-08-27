'use server'

import { createClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/supabase/verified-user'

export type PushSubscriptionJson = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

// 브라우저에서 구독을 새로 만들거나(최초) 재확인할 때마다 호출 — endpoint가 디바이스를 사실상
// 식별하므로 upsert로 같은 디바이스가 다시 구독해도 중복 없이 갱신된다.
export async function savePushSubscription(subscription: PushSubscriptionJson): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getVerifiedUser()
  if (!user) return { error: '인증이 필요합니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
    },
    { onConflict: 'endpoint' },
  )
  if (error) return { error: '알림 등록에 실패했습니다.' }
  return {}
}

// 알림 끄기 버튼 / 구독 해제 시 호출
export async function deletePushSubscription(endpoint: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getVerifiedUser()
  if (!user) return { error: '인증이 필요합니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id)
  if (error) return { error: '알림 해제에 실패했습니다.' }
  return {}
}
