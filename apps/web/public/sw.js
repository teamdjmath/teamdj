// 웹 푸시 서비스 워커 — 탭이 닫혀있어도 브라우저가 이 스크립트를 깨워 알림을 띄운다.
// notifications.createNotification()이 보낸 payload(JSON: {title, body, url})를 그대로 받는다.

self.addEventListener('push', (event) => {
  let data = { title: 'TeamDJ', body: '새 알림이 있습니다.' }
  try {
    if (event.data) data = event.data.json()
  } catch {
    // JSON이 아니면 기본값 그대로 사용
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon',
      badge: '/icon',
      data: { url: data.url || '/' },
    }),
  )
})

// 알림을 클릭하면 해당 링크의 탭을 찾아 포커스하거나, 없으면 새로 연다.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})
