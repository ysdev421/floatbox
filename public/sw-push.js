// push イベント: 通知を表示
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? 'FloatBox'
  const options = {
    body: data.body ?? 'モヤモヤを整理しよう',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url ?? '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// 通知クリック: アプリを開く
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus()
      return clients.openWindow(event.notification.data.url)
    })
  )
})
