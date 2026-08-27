'use client'

import { usePushSubscription } from '@/hooks/usePushSubscription'

// 알림 켜기/끄기 버튼 — 관리자 레이아웃(종 아이콘 옆)에서 쓴다. 아이콘만 쓰면 바로 옆 알림함
// 종 아이콘이랑 헷갈리기 쉬워 글자 라벨로 구분한다. 학생 쪽은 "더보기 > 알림 설정"에 이미 있는
// "알림 허용" 스위치가 이 역할을 하므로 별도 버튼을 안 둔다(usePushSubscription 훅을 그 스위치에서
// 직접 사용 — more-client.tsx 참고).
export function PushNotificationToggle({ className = '' }: { className?: string }) {
  const { supported, subscribed, isPending, subscribe, unsubscribe } = usePushSubscription()

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={isPending}
      title={subscribed ? '클릭하면 웹 푸시 알림이 꺼져요' : '클릭하면 이 브라우저로 웹 푸시 알림을 받아요'}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
        subscribed
          ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
          : 'bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300'
      } ${className}`}
    >
      {subscribed ? '웹 푸시 차단' : '웹 푸시 받기'}
    </button>
  )
}
