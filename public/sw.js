self.addEventListener('push', function (event) {
  let data = {}
  if (event.data) {
    try { data = event.data.json() } catch { data = { title: event.data.text() } }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Laundry Tracker', {
      body: data.body || 'You have laundry to check on.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag || 'laundry-reminder',
      data: { url: data.url || '/batches' },
    })
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(event.notification.data.url)
          return client.focus()
        }
      }
      return clients.openWindow(event.notification.data.url)
    })
  )
})
