'use client'

import { useEffect, useState, useTransition } from 'react'
import { savePushSubscription, deletePushSubscription } from '@/lib/actions/push-subscriptions'

// VAPID 공개키(base64url)를 브라우저 PushManager가 요구하는 Uint8Array 형식으로 변환.
// new ArrayBuffer(...)로 명시적으로 만들어야 최신 TS DOM 타입(ArrayBuffer vs ArrayBufferLike)과 맞는다.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

// 웹 푸시 구독 상태 + 켜기/끄기 — 관리자 화면의 종 아이콘 토글, 학생 "더보기 > 알림 설정"의
// "알림 허용" 스위치 둘 다 이 훅 하나를 공유한다(로직 중복 방지).
export function usePushSubscription() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setSupported(true)
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    }).catch(() => {})
  }, [])

  function subscribe(): Promise<void> {
    return new Promise((resolve) => {
      startTransition(async () => {
        try {
          const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          if (!publicKey) return

          const permission = await Notification.requestPermission()
          if (permission !== 'granted') return

          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          })
          const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } }
          if (!json.endpoint || !json.keys) return

          await savePushSubscription({ endpoint: json.endpoint, keys: json.keys })
          setSubscribed(true)
        } catch {
          // 권한 거부 등 — 조용히 무시, subscribed는 false로 유지
        } finally {
          resolve()
        }
      })
    })
  }

  function unsubscribe(): Promise<void> {
    return new Promise((resolve) => {
      startTransition(async () => {
        try {
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.getSubscription()
          if (sub) {
            await deletePushSubscription(sub.endpoint)
            await sub.unsubscribe()
          }
        } finally {
          setSubscribed(false)
          resolve()
        }
      })
    })
  }

  return { supported, subscribed, isPending, subscribe, unsubscribe }
}
